#pragma once

#include "board.hpp"

#include <array>
#include <chrono>
#include <cstdint>
#include <functional>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

namespace voltorb {

// Unsigned fixed-width integer used for exact Bayesian probability mass.
// The largest per-level common denominator is 231 bits; total posterior mass
// remains below 256 bits.
struct ExactWeight {
    std::array<uint64_t, 4> limbs{};

    bool isZero() const;
    double toDouble() const;

    ExactWeight& operator+=(const ExactWeight& other);
    ExactWeight& operator-=(const ExactWeight& other);

    friend ExactWeight operator+(ExactWeight left, const ExactWeight& right) {
        left += right;
        return left;
    }

    friend ExactWeight operator-(ExactWeight left, const ExactWeight& right) {
        left -= right;
        return left;
    }

    friend bool operator==(const ExactWeight& left, const ExactWeight& right) {
        return left.limbs == right.limbs;
    }

    friend bool operator!=(const ExactWeight& left, const ExactWeight& right) {
        return !(left == right);
    }

    friend bool operator<(const ExactWeight& left, const ExactWeight& right);
    friend bool operator>(const ExactWeight& left, const ExactWeight& right) {
        return right < left;
    }
    friend bool operator<=(const ExactWeight& left, const ExactWeight& right) {
        return !(right < left);
    }
    friend bool operator>=(const ExactWeight& left, const ExactWeight& right) {
        return !(left < right);
    }
};

struct CertifiedSolverResult {
    Position suggestedPosition;
    double winProbability;
    double winProbabilityUpper;
    bool isExact;
    bool moveProven;
    bool capped;
    size_t boardsEvaluated;
    std::chrono::milliseconds computeTime;
    int searchDepth;
    std::optional<std::string> reason;
};

struct CertifiedSolverProgress {
    Position bestPanel;
    double winProbability;
    double winProbabilityUpper;
    int depth;
    bool isExact;
    bool moveProven;
    size_t nodesSearched;
    std::chrono::milliseconds elapsed;
};

using CertifiedProgressCallback = std::function<void(const CertifiedSolverProgress&)>;

struct CertifiedSolverOptions {
    std::chrono::milliseconds timeout{60000};
    size_t maxCompatibleBoards{500000};
    size_t maxMemoEntries{500000};
    int maxDepth{25};
};

struct CertifiedSearchState {
    Board board;
    std::vector<size_t> compatible;
    ExactWeight totalWeight;
};

struct CertifiedDepthResult {
    Position bestPanel;
    ExactWeight lower;
    ExactWeight upper;
    double estimateWeight;
    bool isExact;
    bool moveProven;
};

struct CertifiedMemoEntry {
    CertifiedDepthResult result;
    int depth;
};

/**
 * Exact-mass anytime solver.
 *
 * Every physical board receives an integer weight proportional to its exact
 * probability under the game's uniform board-type selection and rejection
 * sampler. Search bounds are sums of those weights, so floating-point
 * estimates can order work but can never prune or certify a move.
 */
class CertifiedSolver {
public:
    explicit CertifiedSolver(CertifiedSolverOptions options = {});

    CertifiedSolverResult solve(
        const Board& board,
        CertifiedProgressCallback onProgress = nullptr);

    const std::vector<Board>& getCompatibleBoards() const { return allBoards_; }
    bool isCapped() const { return capped_; }

private:
    struct Candidate {
        Position pos;
        ExactWeight lower;
        ExactWeight upper;
        double estimateWeight = 0.0;
        bool evaluated = false;
        bool hasPolicyLower = false;
    };

    struct PolicyResult {
        ExactWeight mass;
        bool complete = true;
    };

    CertifiedSolverOptions options_;
    std::unordered_map<uint64_t, CertifiedMemoEntry> memo_;
    std::unordered_map<uint64_t, ExactWeight> policyMemo_;
    std::chrono::steady_clock::time_point startTime_;
    std::chrono::steady_clock::time_point policyDeadline_;
    bool timedOut_ = false;
    bool capped_ = false;
    size_t nodesEvaluated_ = 0;
    std::vector<Board> allBoards_;
    std::vector<ExactWeight> boardWeights_;
    ExactWeight rootWeight_;
    std::array<ExactWeight, TOTAL_PANELS> rootPolicyLower_{};
    Position rootFallbackPanel_{0, 0};
    uint64_t rootStateKey_ = 0;

    bool checkTimeout();
    std::optional<CertifiedSearchState> initializeSearch(const Board& board);
    CertifiedSolverResult iterativeDeepening(
        const CertifiedSearchState& initialState,
        CertifiedProgressCallback onProgress);
    CertifiedDepthResult depthLimitedSearch(
        const CertifiedSearchState& state,
        int depthLimit);

    uint64_t stateKey(const Board& board) const;
    ExactWeight weightOfValue(
        const CertifiedSearchState& state,
        Position pos,
        PanelValue value) const;
    double probabilityOf(
        const CertifiedSearchState& state,
        Position pos,
        PanelValue value) const;
    CertifiedSearchState revealPanel(
        const CertifiedSearchState& state,
        Position pos,
        PanelValue value) const;

    bool isWon(const CertifiedSearchState& state) const;
    bool hasMultiplierPotential(
        const CertifiedSearchState& state,
        Position pos) const;
    std::optional<Position> findFreePanel(
        const CertifiedSearchState& state) const;
    std::vector<Position> getOrderedUnknownPanels(
        const CertifiedSearchState& state) const;
    double heuristicEstimate(const CertifiedSearchState& state) const;
    PolicyResult evaluateGreedyPolicy(const CertifiedSearchState& state);
    void buildRootPolicyBounds(const CertifiedSearchState& state);

    double ratio(const ExactWeight& numerator) const;
};

} // namespace voltorb
