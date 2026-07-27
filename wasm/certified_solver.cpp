#include "voltorb/certified_solver.hpp"

#include "voltorb/board_type.hpp"
#include "voltorb/constraints.hpp"

#include <algorithm>
#include <cmath>
#include <limits>
#include <string>
#include <unordered_set>

namespace voltorb {
namespace {

using TypeWeightTable =
    std::array<std::array<ExactWeight, NUM_TYPES_PER_LEVEL>, MAX_LEVEL>;

// LCM(N_accepted[level][*]) / N_accepted[level][type], stored as four
// little-endian 64-bit limbs. Uniform 1/10 type priors cancel during
// normalization. Generated from the reverse-engineered accepted-board counts.
const TypeWeightTable TYPE_WEIGHTS = {{
    {{
        {{{0x0000029846ba5a97ULL, 0, 0, 0}}},
        {{{0x000037779776b1dcULL, 0, 0, 0}}},
        {{{0x000003317c220d84ULL, 0, 0, 0}}},
        {{{0x000001bad9d191baULL, 0, 0, 0}}},
        {{{0x000000a37f3a02b4ULL, 0, 0, 0}}},
        {{{0x0000029846ba5a97ULL, 0, 0, 0}}},
        {{{0x000037779776b1dcULL, 0, 0, 0}}},
        {{{0x000003317c220d84ULL, 0, 0, 0}}},
        {{{0x000001bad9d191baULL, 0, 0, 0}}},
        {{{0x000000a37f3a02b4ULL, 0, 0, 0}}},
    }},
    {{
        {{{0xaf726fdc87e937f6ULL, 0x00000000727520b2ULL, 0, 0}}},
        {{{0xa9fd88586c9dcf44ULL, 0x0000000041b4344dULL, 0, 0}}},
        {{{0x105fa08df567c10dULL, 0x0000000015b6ae8bULL, 0, 0}}},
        {{{0xbdc9bf721fa4dfd8ULL, 0x00000001c9d482caULL, 0, 0}}},
        {{{0xf1aa4164121a4d36ULL, 0x000000000af35e0cULL, 0, 0}}},
        {{{0xe2aa7a583fb418e8ULL, 0x000000008c0e3238ULL, 0, 0}}},
        {{{0xe2c1b32dc40f6088ULL, 0x0000000053a498aeULL, 0, 0}}},
        {{{0xc1f46aaf95f37238ULL, 0x000000001a3485d2ULL, 0, 0}}},
        {{{0x8aa9e960fed063a0ULL, 0x000000023038c8e3ULL, 0, 0}}},
        {{{0x25caf3324b57e56cULL, 0x000000000df0c41dULL, 0, 0}}},
    }},
    {{
        {{{0xf82a45e22ebf95fcULL, 0x00e4e69fb02c031cULL, 0, 0}}},
        {{{0xa459954245640bbeULL, 0x0268f8f7dd1cb347ULL, 0, 0}}},
        {{{0x16fc58d82799f14cULL, 0x003701f469d2e47fULL, 0, 0}}},
        {{{0xf0548bc45d7f2bf8ULL, 0x01c9cd3f60580639ULL, 0, 0}}},
        {{{0xb23f53a04e67546bULL, 0x0061f7b85ed39417ULL, 0, 0}}},
        {{{0xf135263b0525e69eULL, 0x00f8dcba447aaf95ULL, 0, 0}}},
        {{{0xdfbb496224d34eedULL, 0x02adc60a97c90ca5ULL, 0, 0}}},
        {{{0x62da387b6f33d0f4ULL, 0x003e4940d5439d39ULL, 0, 0}}},
        {{{0xe26a4c760a4bcd3cULL, 0x01f1b97488f55f2bULL, 0, 0}}},
        {{{0xb23f53a04e67546bULL, 0x0061f7b85ed39417ULL, 0, 0}}},
    }},
    {{
        {{{0x07f213272c2fb48cULL, 0x179a091dce14c92eULL, 0x0a83edd487dbab03ULL, 0x2ULL}}},
        {{{0x6a957b4ad53ad6e0ULL, 0x83405f34fd0c5710ULL, 0x032c2c5400c6f39eULL, 0x64ULL}}},
        {{{0x3c498931f28cf540ULL, 0x5b508722f3158c9dULL, 0x0fd57951b65bba5bULL, 0x13ULL}}},
        {{{0xbb6983363c14be48ULL, 0x8b2d2ae5f67de284ULL, 0x0a9b0c4ee9a2ac45ULL, 0x1ULL}}},
        {{{0x5f7dddca7109ecd0ULL, 0xbbcfb8bca11f0263ULL, 0xb6d34e81fdcbc011ULL, 0x1ULL}}},
        {{{0x07f213272c2fb48cULL, 0x179a091dce14c92eULL, 0x0a83edd487dbab03ULL, 0x2ULL}}},
        {{{0x64e23024bcacf070ULL, 0x828a702669a87d2dULL, 0xbbe6e6279b0f5a9eULL, 0x6cULL}}},
        {{{0xd0ce4b64542ea740ULL, 0x360dcce62b1c2673ULL, 0x76a816c56a0f7283ULL, 0x13ULL}}},
        {{{0xb21ab0ba0da3f9afULL, 0xfd52c08790679c85ULL, 0x0e164c2b04fea4b7ULL, 0x1ULL}}},
        {{{0xd360f4f630248c90ULL, 0x1ebb6f08bb9b553cULL, 0xc0795ecb3c0ed599ULL, 0x1ULL}}},
    }},
    {{
        {{{0x07da53e95dc1b138ULL, 0xdebc346df3555cd2ULL, 0x000000046641d40bULL, 0}}},
        {{{0x8db50b6074b954a8ULL, 0x0f8a1dc58ab5e1eaULL, 0x00000001275aab53ULL, 0}}},
        {{{0x08d1a52f4fe15058ULL, 0x4136f6fac04e119aULL, 0x00000007e99a514eULL, 0}}},
        {{{0x75d77fec2be44440ULL, 0x741023127d040594ULL, 0x00000030924e97bbULL, 0}}},
        {{{0x6ff53c8bd1a50e10ULL, 0x88c80efad7cf3f17ULL, 0x0000000141c9aa4cULL, 0}}},
        {{{0x8c9449feaf0b05f8ULL, 0x9f00127ffb8db58dULL, 0x000000047dfd0abaULL, 0}}},
        {{{0x97f9c3dfbec1f583ULL, 0x2438f81f328b9ea6ULL, 0x000000012b360608ULL, 0}}},
        {{{0x8c1cdb9ff6b5f978ULL, 0xb57e4a72ab559cb4ULL, 0x0000000816240b86ULL, 0}}},
        {{{0x6b229ad70de91440ULL, 0xf0846e1e36f831efULL, 0x000000311760966eULL, 0}}},
        {{{0x95e139b67b27b890ULL, 0x9b24979247df5871ULL, 0x00000001489170c7ULL, 0}}},
    }},
    {{
        {{{0xa91f22215e2bfdf8ULL, 0x2e9e5950a021a5bfULL, 0x00000003761001f9ULL, 0}}},
        {{{0x9ebd9d539dd7a630ULL, 0x95dd5da1857d3cd4ULL, 0x0000008e6cd9b780ULL, 0}}},
        {{{0x2747d54eb94c16c0ULL, 0x7c05610629ac01dcULL, 0x0000001030c4dd3eULL, 0}}},
        {{{0x27efdad1ba779518ULL, 0xcd2c167843b6dea3ULL, 0x00000001e2ae7f72ULL, 0}}},
        {{{0xc48938e2479ea748ULL, 0x4db294dbb58d6994ULL, 0x00000005c4c5589fULL, 0}}},
        {{{0xc7ed4b9f3c45e089ULL, 0x6caae85d97a2dbf3ULL, 0x0000000381a21218ULL, 0}}},
        {{{0xda07713f58cb8a70ULL, 0xc2e13c100c0504b1ULL, 0x000000918e88cf78ULL, 0}}},
        {{{0x23b6339d04a306c0ULL, 0xfad6cf5f67a810a5ULL, 0x000000105d203224ULL, 0}}},
        {{{0x60d1d691b8bb94d8ULL, 0x68b6e35b6bcf04aaULL, 0x00000001ecda292bULL, 0}}},
        {{{0xf7e0d35eb9c9cb8fULL, 0xb51cd89bfcba1940ULL, 0x00000005d80e1e28ULL, 0}}},
    }},
    {{
        {{{0xdb7876a5c6e36389ULL, 0x000c60414307e6dcULL, 0, 0}}},
        {{{0x4cd94b2aaffd17daULL, 0x00049caceb5ddd8fULL, 0, 0}}},
        {{{0x124c06a4bbf41727ULL, 0x00e4c863c3f88c8fULL, 0, 0}}},
        {{{0x001060af8f609807ULL, 0x0716a5c10b3e3b8aULL, 0, 0}}},
        {{{0x82a1576b9e6173cdULL, 0x00054dd2d395ac15ULL, 0, 0}}},
        {{{0x53fe411463869cc9ULL, 0x000c82294271fa47ULL, 0, 0}}},
        {{{0xcb86eda1439c14eaULL, 0x0004b58dac9cf192ULL, 0, 0}}},
        {{{0x124c06a4bbf41727ULL, 0x00e4c863c3f88c8fULL, 0, 0}}},
        {{{0x001060af8f609807ULL, 0x0716a5c10b3e3b8aULL, 0, 0}}},
        {{{0x23ff407673cbfa0dULL, 0x00055c5ad3556b43ULL, 0, 0}}},
    }},
    {{
        {{{0x5eadb0ca3ccb5448ULL, 0xbb042ca29c1d2d4fULL, 0x0000000f4aa33216ULL, 0}}},
        {{{0x2b4e7ed513eab7c0ULL, 0x11a8a86cb10682e3ULL, 0x000000009c2eba98ULL, 0}}},
        {{{0xb32adb9c62553720ULL, 0x78cd9e601404ece4ULL, 0x00000000255ee74eULL, 0}}},
        {{{0x5d55d9b120fc0370ULL, 0x028d4ba11044b3a7ULL, 0x0000000079db59b3ULL, 0}}},
        {{{0x303d6f8fe77804e8ULL, 0x069f3f28c2627115ULL, 0x000000003a9185f9ULL, 0}}},
        {{{0x8f32cd26b94b60efULL, 0x7259ae1c7ffaa91cULL, 0x0000000f7dc1a254ULL, 0}}},
        {{{0x6104eb79f91584c0ULL, 0xf1e84ad2eb4c3825ULL, 0x000000009ee6ccb9ULL, 0}}},
        {{{0x42368a9b1967df20ULL, 0x327d8eb9ff2ba601ULL, 0x0000000025c5498aULL, 0}}},
        {{{0xd02f1450880f54f0ULL, 0xf6df953011866881ULL, 0x000000007c6caa79ULL, 0}}},
        {{{0x0461d84dbd6811c8ULL, 0xbab71c0f183c950eULL, 0x000000003b968cc5ULL, 0}}},
    }},
}};

std::string physicalBoardKey(const Board& board) {
    std::string key;
    key.reserve(TOTAL_PANELS);
    for (size_t row = 0; row < BOARD_SIZE; row++) {
        for (size_t col = 0; col < BOARD_SIZE; col++) {
            key.push_back(static_cast<char>(
                toInt(board.get(
                    static_cast<uint8_t>(row),
                    static_cast<uint8_t>(col))) + 1));
        }
    }
    return key;
}

ExactWeight maxWeight(const ExactWeight& left, const ExactWeight& right) {
    return left < right ? right : left;
}

double clampEstimate(
    double estimate,
    const ExactWeight& lower,
    const ExactWeight& upper) {
    return std::clamp(estimate, lower.toDouble(), upper.toDouble());
}

} // namespace

bool ExactWeight::isZero() const {
    return limbs[0] == 0 && limbs[1] == 0 && limbs[2] == 0 && limbs[3] == 0;
}

double ExactWeight::toDouble() const {
    double value = 0.0;
    for (size_t i = 0; i < limbs.size(); i++) {
        value += std::ldexp(static_cast<double>(limbs[i]), static_cast<int>(64 * i));
    }
    return value;
}

ExactWeight& ExactWeight::operator+=(const ExactWeight& other) {
    uint64_t carry = 0;
    for (size_t i = 0; i < limbs.size(); i++) {
        const uint64_t first = limbs[i] + other.limbs[i];
        const uint64_t carryFirst = first < limbs[i] ? 1 : 0;
        const uint64_t second = first + carry;
        const uint64_t carrySecond = second < first ? 1 : 0;
        limbs[i] = second;
        carry = carryFirst | carrySecond;
    }
    return *this;
}

ExactWeight& ExactWeight::operator-=(const ExactWeight& other) {
    uint64_t borrow = 0;
    for (size_t i = 0; i < limbs.size(); i++) {
        const uint64_t subtrahend = other.limbs[i] + borrow;
        const uint64_t overflow = subtrahend < other.limbs[i] ? 1 : 0;
        const uint64_t nextBorrow = (limbs[i] < subtrahend) | overflow;
        limbs[i] -= subtrahend;
        borrow = nextBorrow;
    }
    return *this;
}

bool operator<(const ExactWeight& left, const ExactWeight& right) {
    for (size_t i = left.limbs.size(); i-- > 0;) {
        if (left.limbs[i] != right.limbs[i]) {
            return left.limbs[i] < right.limbs[i];
        }
    }
    return false;
}

CertifiedSolver::CertifiedSolver(CertifiedSolverOptions options)
    : options_(std::move(options)) {}

bool CertifiedSolver::checkTimeout() {
    if (timedOut_) return true;
    timedOut_ =
        std::chrono::steady_clock::now() - startTime_ >= options_.timeout;
    return timedOut_;
}

CertifiedSolverResult CertifiedSolver::solve(
    const Board& board,
    CertifiedProgressCallback onProgress) {
    startTime_ = std::chrono::steady_clock::now();
    timedOut_ = false;
    capped_ = false;
    nodesEvaluated_ = 0;
    memo_.clear();
    policyMemo_.clear();
    allBoards_.clear();
    boardWeights_.clear();
    rootWeight_ = {};
    rootPolicyLower_ = {};
    rootFallbackPanel_ = {0, 0};
    rootStateKey_ = 0;

    const GameResult gameState = board.checkGameResult();
    if (gameState == GameResult::Won || gameState == GameResult::Lost) {
        const bool won = gameState == GameResult::Won;
        return {
            {0, 0},
            won ? 1.0 : 0.0,
            won ? 1.0 : 0.0,
            true,
            true,
            false,
            0,
            std::chrono::milliseconds(0),
            0,
            won ? "Game already won" : "Game already lost"};
    }

    auto initialState = initializeSearch(board);
    if (!initialState) {
        return {
            {0, 0},
            0.0,
            0.0,
            true,
            false,
            capped_,
            0,
            std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::steady_clock::now() - startTime_),
            0,
            "No compatible boards found"};
    }

    return iterativeDeepening(*initialState, std::move(onProgress));
}

std::optional<CertifiedSearchState> CertifiedSolver::initializeSearch(
    const Board& board) {
    std::unordered_set<std::string> seen;
    seen.reserve(options_.maxCompatibleBoards);

    CompatibleBoardGenerator::generateAllTypes(
        board,
        [&](const Board& candidate) {
            std::string key = physicalBoardKey(candidate);
            if (seen.insert(std::move(key)).second) {
                if (allBoards_.size() >= options_.maxCompatibleBoards) {
                    capped_ = true;
                    return false;
                }
                allBoards_.push_back(candidate);
            }
            return allBoards_.size() < options_.maxCompatibleBoards;
        });

    if (allBoards_.empty()) return std::nullopt;
    if (allBoards_.size() >= options_.maxCompatibleBoards) capped_ = true;

    const Level level = board.level();
    boardWeights_.reserve(allBoards_.size());

    for (const Board& candidate : allBoards_) {
        int count0 = 0;
        int count2 = 0;
        int count3 = 0;
        for (size_t row = 0; row < BOARD_SIZE; row++) {
            for (size_t col = 0; col < BOARD_SIZE; col++) {
                const PanelValue value = candidate.get(
                    static_cast<uint8_t>(row),
                    static_cast<uint8_t>(col));
                if (value == PanelValue::Voltorb) count0++;
                if (value == PanelValue::Two) count2++;
                if (value == PanelValue::Three) count3++;
            }
        }

        ExactWeight weight;
        for (BoardTypeIndex type = 0; type < NUM_TYPES_PER_LEVEL; type++) {
            const auto& params = BoardTypeData::params(level, type);
            if (
                params.n0 == count0 &&
                params.n2 == count2 &&
                params.n3 == count3 &&
                LegalityChecker::isLegal(candidate, params)) {
                weight += TYPE_WEIGHTS[level - 1][type];
            }
        }
        boardWeights_.push_back(weight);
        rootWeight_ += weight;
    }

    CertifiedSearchState state;
    state.board = board;
    state.compatible.reserve(allBoards_.size());
    for (size_t index = 0; index < allBoards_.size(); index++) {
        state.compatible.push_back(index);
    }
    state.totalWeight = rootWeight_;
    rootStateKey_ = stateKey(state.board);
    buildRootPolicyBounds(state);
    return state;
}

CertifiedSolverResult CertifiedSolver::iterativeDeepening(
    const CertifiedSearchState& initialState,
    CertifiedProgressCallback onProgress) {
    CertifiedDepthResult bestCompleted{
        rootFallbackPanel_,
        rootPolicyLower_[rootFallbackPanel_.toIndex()],
        initialState.totalWeight,
        rootPolicyLower_[rootFallbackPanel_.toIndex()].toDouble(),
        false,
        false};
    int lastDepth = 0;

    const auto freePanel = findFreePanel(initialState);

    for (int depth = 1; depth <= options_.maxDepth && !timedOut_; depth++) {
        memo_.clear();
        auto result = depthLimitedSearch(initialState, depth);
        if (timedOut_) break;

        bestCompleted = result;
        lastDepth = depth;

        if (onProgress) {
            onProgress({
                freePanel ? *freePanel : result.bestPanel,
                ratio(result.lower),
                ratio(result.upper),
                depth,
                result.isExact,
                result.moveProven || freePanel.has_value(),
                nodesEvaluated_,
                std::chrono::duration_cast<std::chrono::milliseconds>(
                    std::chrono::steady_clock::now() - startTime_)});
        }

        if (result.isExact || result.moveProven || freePanel) break;
        checkTimeout();
    }

    const bool moveProven = freePanel.has_value() || bestCompleted.moveProven;
    const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now() - startTime_);

    std::string reason;
    if (freePanel) {
        reason = "Guaranteed-safe move proven optimal";
    } else if (bestCompleted.isExact) {
        reason = "Exact optimal value and move proven";
    } else if (moveProven) {
        reason = "Optimal move proven by exact action bounds";
    } else if (timedOut_) {
        reason = "Timeout with rigorous bounds at depth " +
            std::to_string(lastDepth);
    } else {
        reason = "Rigorous bounds at depth " + std::to_string(lastDepth);
    }

    return {
        freePanel ? *freePanel : bestCompleted.bestPanel,
        ratio(bestCompleted.lower),
        ratio(bestCompleted.upper),
        bestCompleted.isExact,
        moveProven,
        capped_,
        allBoards_.size(),
        elapsed,
        lastDepth,
        reason};
}

CertifiedDepthResult CertifiedSolver::depthLimitedSearch(
    const CertifiedSearchState& state,
    int depthLimit) {
    nodesEvaluated_++;

    if (isWon(state)) {
        return {
            {0, 0},
            state.totalWeight,
            state.totalWeight,
            state.totalWeight.toDouble(),
            true,
            true};
    }

    if (depthLimit <= 0 || checkTimeout()) {
        return {
            {0, 0},
            {},
            state.totalWeight,
            heuristicEstimate(state) * state.totalWeight.toDouble(),
            false,
            false};
    }

    const uint64_t key = stateKey(state.board);
    auto memoIt = memo_.find(key);
    if (memoIt != memo_.end() && memoIt->second.depth >= depthLimit) {
        return memoIt->second.result;
    }

    if (auto freePanel = findFreePanel(state)) {
        ExactWeight lower;
        ExactWeight upper;
        double estimate = 0.0;
        bool exact = true;

        for (int rawValue = 1; rawValue <= 3; rawValue++) {
            const auto value = static_cast<PanelValue>(rawValue);
            if (weightOfValue(state, *freePanel, value).isZero()) continue;
            const auto child = depthLimitedSearch(
                revealPanel(state, *freePanel, value),
                depthLimit);
            lower += child.lower;
            upper += child.upper;
            estimate += child.estimateWeight;
            exact = exact && child.isExact;
        }

        CertifiedDepthResult result{
            *freePanel,
            lower,
            upper,
            clampEstimate(estimate, lower, upper),
            exact || lower == upper,
            true};
        if (memo_.size() < options_.maxMemoEntries) {
            memo_[key] = {result, depthLimit};
        }
        return result;
    }

    const auto panels = getOrderedUnknownPanels(state);
    if (panels.empty()) {
        return {{0, 0}, {}, {}, 0.0, true, false};
    }

    std::vector<Candidate> candidates;
    candidates.reserve(panels.size());
    for (const Position pos : panels) {
        const ExactWeight bombWeight =
            weightOfValue(state, pos, PanelValue::Voltorb);
        candidates.push_back({
            pos,
            {},
            state.totalWeight - bombWeight,
            0.0,
            false});
    }

    const bool isRoot = key == rootStateKey_;
    ExactWeight stateLower;
    ExactWeight stateUpper;

    if (isRoot) {
        for (Candidate& candidate : candidates) {
            const ExactWeight policyLower =
                rootPolicyLower_[candidate.pos.toIndex()];
            candidate.lower = policyLower;
            candidate.hasPolicyLower = !policyLower.isZero();
            candidate.estimateWeight = policyLower.toDouble();
            stateLower = maxWeight(stateLower, policyLower);
        }
    }

    // Reuse every fully evaluated greedy continuation as a concrete policy
    // floor below the root. These are exact success masses, so they improve
    // pruning without turning a heuristic estimate into a proof.
    const auto policyMemoIt = policyMemo_.find(key);
    if (policyMemoIt != policyMemo_.end()) {
        const Position policyAction = panels.front();
        for (Candidate& candidate : candidates) {
            if (candidate.pos != policyAction) continue;
            candidate.lower = maxWeight(
                candidate.lower,
                policyMemoIt->second);
            candidate.hasPolicyLower = !policyMemoIt->second.isZero();
            candidate.estimateWeight = std::max(
                candidate.estimateWeight,
                policyMemoIt->second.toDouble());
            stateLower = maxWeight(stateLower, candidate.lower);
            break;
        }
    }

    for (Candidate& candidate : candidates) {
        if (candidate.upper <= stateLower) {
            candidate.estimateWeight = clampEstimate(
                candidate.estimateWeight,
                candidate.lower,
                candidate.upper);
            continue;
        }

        ExactWeight actionLower;
        ExactWeight actionUpper = candidate.upper;
        double actionEstimate = 0.0;

        for (int rawValue = 1; rawValue <= 3; rawValue++) {
            const auto value = static_cast<PanelValue>(rawValue);
            if (weightOfValue(state, candidate.pos, value).isZero()) continue;
            const auto childState =
                revealPanel(state, candidate.pos, value);
            const auto child =
                depthLimitedSearch(childState, depthLimit - 1);
            actionLower += child.lower;
            actionUpper -= childState.totalWeight - child.upper;
            actionEstimate += child.estimateWeight;

            candidate.lower = maxWeight(candidate.lower, actionLower);
            stateLower = maxWeight(stateLower, candidate.lower);
            if (actionUpper <= stateLower) break;
        }

        candidate.upper = actionUpper;
        candidate.estimateWeight =
            clampEstimate(actionEstimate, candidate.lower, actionUpper);
        candidate.evaluated = true;

        if (timedOut_) break;
    }

    // Evaluated actions carry recursively tightened ceilings; pruned and
    // unfinished actions retain their rigorous one-flip survival ceiling.
    for (const Candidate& candidate : candidates) {
        stateUpper = maxWeight(stateUpper, candidate.upper);
    }

    // The recommendation must attain the reported rigorous state floor.
    // Heuristic estimates only break ties between equally strong certified
    // policies; they must never displace a move with a better proven floor.
    size_t selected = 0;
    for (size_t index = 0; index < candidates.size(); index++) {
        if (
            candidates[index].lower > candidates[selected].lower ||
            (
                candidates[index].lower == candidates[selected].lower &&
                candidates[index].estimateWeight >
                    candidates[selected].estimateWeight)) {
            selected = index;
        }
    }

    bool moveProven = false;
    for (size_t index = 0; index < candidates.size(); index++) {
        if (
            !candidates[index].evaluated &&
            !candidates[index].hasPolicyLower) {
            continue;
        }
        ExactWeight competitorUpper;
        for (size_t other = 0; other < candidates.size(); other++) {
            if (other == index) continue;
            competitorUpper =
                maxWeight(competitorUpper, candidates[other].upper);
        }
        if (candidates[index].lower >= competitorUpper) {
            selected = index;
            moveProven = true;
            break;
        }
    }

    const bool exact = stateLower == stateUpper;
    CertifiedDepthResult result{
        candidates[selected].pos,
        stateLower,
        stateUpper,
        clampEstimate(
            candidates[selected].estimateWeight,
            stateLower,
            stateUpper),
        exact,
        moveProven || exact};

    if (!timedOut_ && memo_.size() < options_.maxMemoEntries) {
        memo_[key] = {result, depthLimit};
    }
    return result;
}

uint64_t CertifiedSolver::stateKey(const Board& board) const {
    uint64_t key = 0;
    size_t index = 0;
    for (size_t row = 0; row < BOARD_SIZE; row++) {
        for (size_t col = 0; col < BOARD_SIZE; col++, index++) {
            const PanelValue value = board.get(
                static_cast<uint8_t>(row),
                static_cast<uint8_t>(col));
            const uint64_t encoded = value == PanelValue::Unknown
                ? 0
                : static_cast<uint64_t>(toInt(value));
            key |= encoded << (index * 2);
        }
    }
    return key;
}

ExactWeight CertifiedSolver::weightOfValue(
    const CertifiedSearchState& state,
    Position pos,
    PanelValue value) const {
    ExactWeight weight;
    for (const size_t index : state.compatible) {
        if (allBoards_[index].get(pos) == value) {
            weight += boardWeights_[index];
        }
    }
    return weight;
}

double CertifiedSolver::probabilityOf(
    const CertifiedSearchState& state,
    Position pos,
    PanelValue value) const {
    if (state.totalWeight.isZero()) return 0.0;
    return weightOfValue(state, pos, value).toDouble() /
        state.totalWeight.toDouble();
}

CertifiedSearchState CertifiedSolver::revealPanel(
    const CertifiedSearchState& state,
    Position pos,
    PanelValue value) const {
    CertifiedSearchState next;
    next.board = state.board.withPanelRevealed(pos, value);
    next.compatible.reserve(state.compatible.size());
    for (const size_t index : state.compatible) {
        if (allBoards_[index].get(pos) == value) {
            next.compatible.push_back(index);
            next.totalWeight += boardWeights_[index];
        }
    }
    return next;
}

bool CertifiedSolver::isWon(const CertifiedSearchState& state) const {
    for (size_t row = 0; row < BOARD_SIZE; row++) {
        for (size_t col = 0; col < BOARD_SIZE; col++) {
            const Position pos{
                static_cast<uint8_t>(row),
                static_cast<uint8_t>(col)};
            if (
                state.board.get(pos) == PanelValue::Unknown &&
                hasMultiplierPotential(state, pos)) {
                return false;
            }
        }
    }
    return true;
}

bool CertifiedSolver::hasMultiplierPotential(
    const CertifiedSearchState& state,
    Position pos) const {
    for (const size_t index : state.compatible) {
        if (isMultiplier(allBoards_[index].get(pos))) return true;
    }
    return false;
}

std::optional<Position> CertifiedSolver::findFreePanel(
    const CertifiedSearchState& state) const {
    for (size_t row = 0; row < BOARD_SIZE; row++) {
        for (size_t col = 0; col < BOARD_SIZE; col++) {
            const Position pos{
                static_cast<uint8_t>(row),
                static_cast<uint8_t>(col)};
            if (state.board.get(pos) != PanelValue::Unknown) continue;
            if (!hasMultiplierPotential(state, pos)) continue;
            if (weightOfValue(state, pos, PanelValue::Voltorb).isZero()) {
                return pos;
            }
        }
    }
    return std::nullopt;
}

std::vector<Position> CertifiedSolver::getOrderedUnknownPanels(
    const CertifiedSearchState& state) const {
    std::vector<std::pair<Position, double>> ordered;
    for (size_t row = 0; row < BOARD_SIZE; row++) {
        for (size_t col = 0; col < BOARD_SIZE; col++) {
            const Position pos{
                static_cast<uint8_t>(row),
                static_cast<uint8_t>(col)};
            if (state.board.get(pos) != PanelValue::Unknown) continue;
            if (!hasMultiplierPotential(state, pos)) continue;
            ordered.emplace_back(
                pos,
                probabilityOf(state, pos, PanelValue::Voltorb));
        }
    }
    std::stable_sort(
        ordered.begin(),
        ordered.end(),
        [](const auto& left, const auto& right) {
            return left.second < right.second;
        });

    std::vector<Position> result;
    result.reserve(ordered.size());
    for (const auto& [pos, unused] : ordered) {
        static_cast<void>(unused);
        result.push_back(pos);
    }
    return result;
}

double CertifiedSolver::heuristicEstimate(
    const CertifiedSearchState& state) const {
    if (isWon(state)) return 1.0;

    size_t possibleMultiplierPanels = 0;
    std::vector<double> bombProbabilities;
    for (size_t row = 0; row < BOARD_SIZE; row++) {
        for (size_t col = 0; col < BOARD_SIZE; col++) {
            const Position pos{
                static_cast<uint8_t>(row),
                static_cast<uint8_t>(col)};
            if (
                state.board.get(pos) != PanelValue::Unknown ||
                !hasMultiplierPotential(state, pos)) {
                continue;
            }
            possibleMultiplierPanels++;
            const double risk =
                probabilityOf(state, pos, PanelValue::Voltorb);
            if (risk > 0.0) bombProbabilities.push_back(risk);
        }
    }

    if (possibleMultiplierPanels == 0 || bombProbabilities.empty()) {
        return 1.0;
    }

    std::sort(bombProbabilities.begin(), bombProbabilities.end());
    double estimate = 1.0;
    const size_t count =
        std::min(possibleMultiplierPanels, bombProbabilities.size());
    for (size_t index = 0; index < count; index++) {
        estimate *= 1.0 - bombProbabilities[index];
    }
    return std::clamp(estimate, 0.0, 1.0);
}

CertifiedSolver::PolicyResult CertifiedSolver::evaluateGreedyPolicy(
    const CertifiedSearchState& state) {
    if (isWon(state)) return {state.totalWeight, true};

    const uint64_t key = stateKey(state.board);
    auto memoIt = policyMemo_.find(key);
    if (memoIt != policyMemo_.end()) return {memoIt->second, true};

    if (std::chrono::steady_clock::now() >= policyDeadline_) {
        return {{}, false};
    }

    const auto panels = getOrderedUnknownPanels(state);
    if (panels.empty()) return {{}, true};

    const Position action = findFreePanel(state).value_or(panels.front());
    ExactWeight mass;
    bool complete = true;
    for (int rawValue = 1; rawValue <= 3; rawValue++) {
        const auto value = static_cast<PanelValue>(rawValue);
        if (weightOfValue(state, action, value).isZero()) continue;
        const auto child = evaluateGreedyPolicy(
            revealPanel(state, action, value));
        mass += child.mass;
        complete = complete && child.complete;
    }

    if (complete && policyMemo_.size() < options_.maxMemoEntries) {
        policyMemo_[key] = mass;
    }
    return {mass, complete};
}

void CertifiedSolver::buildRootPolicyBounds(
    const CertifiedSearchState& state) {
    if (auto freePanel = findFreePanel(state)) {
        rootFallbackPanel_ = *freePanel;
        return;
    }

    const auto policyBudget = std::min(
        std::chrono::milliseconds(8000),
        std::max(
            std::chrono::milliseconds(1000),
            options_.timeout / 6));
    policyDeadline_ = std::chrono::steady_clock::now() + policyBudget;

    const auto panels = getOrderedUnknownPanels(state);
    if (panels.empty()) return;
    rootFallbackPanel_ = panels.front();
    ExactWeight bestMass;

    for (const Position action : panels) {
        ExactWeight actionMass;
        for (int rawValue = 1; rawValue <= 3; rawValue++) {
            const auto value = static_cast<PanelValue>(rawValue);
            if (weightOfValue(state, action, value).isZero()) continue;
            actionMass += evaluateGreedyPolicy(
                revealPanel(state, action, value)).mass;
        }
        rootPolicyLower_[action.toIndex()] = actionMass;
        if (actionMass > bestMass) {
            bestMass = actionMass;
            rootFallbackPanel_ = action;
        }
        if (std::chrono::steady_clock::now() >= policyDeadline_) break;
    }
}

double CertifiedSolver::ratio(const ExactWeight& numerator) const {
    if (rootWeight_.isZero()) return 0.0;
    return std::clamp(
        numerator.toDouble() / rootWeight_.toDouble(),
        0.0,
        1.0);
}

} // namespace voltorb
