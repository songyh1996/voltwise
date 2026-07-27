#include <emscripten/bind.h>
#include <emscripten/val.h>

#include "voltorb/board.hpp"
#include "voltorb/certified_solver.hpp"

using namespace emscripten;
using namespace voltorb;

namespace {

Board hydrateBoard(
    int level,
    val panels,
    val rowSums,
    val rowVoltorbs,
    val colSums,
    val colVoltorbs) {
    Board board(static_cast<Level>(level));
    for (int row = 0; row < 5; row++) {
        board.setRowHint(
            static_cast<uint8_t>(row),
            {
                static_cast<uint8_t>(rowSums[row].as<int>()),
                static_cast<uint8_t>(rowVoltorbs[row].as<int>())});
        board.setColHint(
            static_cast<uint8_t>(row),
            {
                static_cast<uint8_t>(colSums[row].as<int>()),
                static_cast<uint8_t>(colVoltorbs[row].as<int>())});
        for (int col = 0; col < 5; col++) {
            board.set(
                static_cast<uint8_t>(row),
                static_cast<uint8_t>(col),
                static_cast<PanelValue>(panels[row * 5 + col].as<int>()));
        }
    }
    return board;
}

val positionValue(Position position) {
    val result = val::object();
    result.set("row", static_cast<int>(position.row));
    result.set("col", static_cast<int>(position.col));
    return result;
}

CertifiedSolverOptions optionsValue(int timeout, int maxBoards) {
    CertifiedSolverOptions options;
    options.timeout = std::chrono::milliseconds(timeout);
    options.maxCompatibleBoards = static_cast<size_t>(maxBoards);
    return options;
}

val resultValue(const CertifiedSolverResult& solverResult) {
    val result = val::object();
    result.set(
        "suggestedPanel",
        solverResult.boardsEvaluated > 0
            ? positionValue(solverResult.suggestedPosition)
            : val::null());
    result.set("winProbability", solverResult.winProbability);
    result.set("winProbabilityUpper", solverResult.winProbabilityUpper);
    result.set("compatibleCount", static_cast<int>(solverResult.boardsEvaluated));
    result.set("capped", solverResult.capped);
    result.set("depth", solverResult.searchDepth);
    result.set("isExact", solverResult.isExact);
    result.set("moveProven", solverResult.moveProven);
    result.set(
        "reason",
        solverResult.reason
            ? *solverResult.reason
            : std::string("Unknown"));
    return result;
}

} // namespace

val solveBoard(
    int level,
    val panels,
    val rowSums,
    val rowVoltorbs,
    val colSums,
    val colVoltorbs,
    int timeout,
    int maxBoards) {
    const Board board = hydrateBoard(
        level,
        panels,
        rowSums,
        rowVoltorbs,
        colSums,
        colVoltorbs);
    CertifiedSolver solver(optionsValue(timeout, maxBoards));
    return resultValue(solver.solve(board));
}

val solveBoardWithProgress(
    int level,
    val panels,
    val rowSums,
    val rowVoltorbs,
    val colSums,
    val colVoltorbs,
    int timeout,
    int maxBoards,
    val progressCallback) {
    const Board board = hydrateBoard(
        level,
        panels,
        rowSums,
        rowVoltorbs,
        colSums,
        colVoltorbs);
    CertifiedSolver solver(optionsValue(timeout, maxBoards));

    CertifiedProgressCallback callback = nullptr;
    if (!progressCallback.isUndefined() && !progressCallback.isNull()) {
        callback = [&progressCallback](const CertifiedSolverProgress& progress) {
            val update = val::object();
            update.set("bestPanel", positionValue(progress.bestPanel));
            update.set("winProbability", progress.winProbability);
            update.set("winProbabilityUpper", progress.winProbabilityUpper);
            update.set("depth", progress.depth);
            update.set("isExact", progress.isExact);
            update.set("moveProven", progress.moveProven);
            update.set(
                "nodesSearched",
                static_cast<double>(progress.nodesSearched));
            progressCallback(update);
        };
    }

    return resultValue(solver.solve(board, std::move(callback)));
}

EMSCRIPTEN_BINDINGS(voltorb_solver) {
    function("solveBoard", &solveBoard);
    function("solveBoardWithProgress", &solveBoardWithProgress);
}
