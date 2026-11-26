// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal view into the official Binance Agent ID registry (ERC-721).
interface IAgentIdRegistry {
    function balanceOf(address account) external view returns (uint256);
}

/// @title AgentPresence
/// @notice Daily check-in for Binance Agent ID holders on BNB Chain.
///         One check-in per UTC day builds a streak; soulbound Presence
///         Badges (ERC-721, non-transferable) are claimable at 3 / 7 / 14 /
///         30 total check-ins. Global counters (distinct agents, total
///         check-ins) are publicly readable.
/// @dev    Self-contained: no external imports. The only external call is
///         `balanceOf` on the Agent ID registry passed to the constructor.
contract AgentPresence {
    // ------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event CheckIn(address indexed agent, uint256 day, uint256 agentTotal, uint256 streak);
    event BadgeClaimed(address indexed agent, uint256 tier, uint256 tokenId);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event TierURISet(uint256 tier, string uri);

    // ------------------------------------------------------------------
    // Errors
    // ------------------------------------------------------------------
    error NotAgentIdHolder();
    error AlreadyCheckedInToday();
    error InvalidTier();
    error ThresholdNotReached();
    error BadgeAlreadyClaimed();
    error Soulbound();
    error NotOwner();
    error ZeroAddress();
    error TokenDoesNotExist();

    // ------------------------------------------------------------------
    // State
    // ------------------------------------------------------------------
    struct AgentStats {
        uint256 total;
        uint256 streak;
        uint256 longestStreak;
        uint256 lastCheckInDay;
        uint256 badgeMask;
    }

    IAgentIdRegistry public immutable agentIdRegistry;
    address public owner;

    uint256 public totalCheckIns;
    uint256 public distinctAgents;

    mapping(address => AgentStats) private _stats;
    mapping(address => bool) private _seen;
    mapping(address => bool) private _hasCheckedIn;

    uint256 private _nextTokenId = 1;
    mapping(uint256 => address) private _tokenOwner;
    mapping(address => uint256) private _badgeBalances;
    mapping(uint256 => uint256) private _tokenTier;
    mapping(uint256 => string) private _tierURIs;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address agentIdRegistry_, address initialOwner) {
        if (agentIdRegistry_ == address(0) || initialOwner == address(0)) {
            revert ZeroAddress();
        }
        agentIdRegistry = IAgentIdRegistry(agentIdRegistry_);
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    // ------------------------------------------------------------------
    // Check-in
    // ------------------------------------------------------------------
    function checkIn() external {
        if (agentIdRegistry.balanceOf(msg.sender) == 0) revert NotAgentIdHolder();

        uint256 today = block.timestamp / 86400;
        AgentStats storage s = _stats[msg.sender];

        if (_hasCheckedIn[msg.sender] && s.lastCheckInDay == today) {
            revert AlreadyCheckedInToday();
        }

        if (!_seen[msg.sender]) {
            _seen[msg.sender] = true;
            distinctAgents += 1;
        }

        if (_hasCheckedIn[msg.sender] && s.lastCheckInDay + 1 == today) {
            s.streak += 1;
        } else {
            s.streak = 1;
        }
        if (s.streak > s.longestStreak) s.longestStreak = s.streak;

        s.total += 1;
        s.lastCheckInDay = today;
        _hasCheckedIn[msg.sender] = true;
        totalCheckIns += 1;

        emit CheckIn(msg.sender, today, s.total, s.streak);
    }

    // ------------------------------------------------------------------
    // Badges
    // ------------------------------------------------------------------
    function badgeThreshold(uint256 tier) public pure returns (uint256) {
        if (tier == 1) return 3;
        if (tier == 2) return 7;
        if (tier == 3) return 14;
        if (tier == 4) return 30;
        revert InvalidTier();
    }

    function badgeThresholds() external pure returns (uint256, uint256, uint256, uint256) {
        return (3, 7, 14, 30);
    }

    function claimBadge(uint256 tier) external {
        uint256 threshold = badgeThreshold(tier); // reverts InvalidTier
        AgentStats storage s = _stats[msg.sender];
        if (s.total < threshold) revert ThresholdNotReached();

        uint256 bit = uint256(1) << (tier - 1);
        if (s.badgeMask & bit != 0) revert BadgeAlreadyClaimed();
        s.badgeMask |= bit;

        uint256 tokenId = _nextTokenId++;
        _tokenOwner[tokenId] = msg.sender;
        _tokenTier[tokenId] = tier;
        _badgeBalances[msg.sender] += 1;

        emit Transfer(address(0), msg.sender, tokenId);
        emit BadgeClaimed(msg.sender, tier, tokenId);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------
    function hasAgentId(address account) public view returns (bool) {
        return agentIdRegistry.balanceOf(account) > 0;
    }

    function getAgentStats(address agent)
        external
        view
        returns (
            uint256 totalCheckIns_,
            uint256 currentStreak,
            uint256 longestStreak,
            uint256 lastCheckInDay,
            uint256 badgeMask
        )
    {
        AgentStats storage s = _stats[agent];
        return (s.total, s.streak, s.longestStreak, s.lastCheckInDay, s.badgeMask);
    }

    function distinctAgentCount() external view returns (uint256) {
        return distinctAgents;
    }

    function totalCheckInCount() external view returns (uint256) {
        return totalCheckIns;
    }

    function tierURI(uint256 tier) external view returns (string memory) {
        if (tier < 1 || tier > 4) revert InvalidTier();
        return _tierURIs[tier];
    }

    // ------------------------------------------------------------------
    // ERC-721 surface (soulbound)
    // ------------------------------------------------------------------
    function name() external pure returns (string memory) {
        return "Presence Badge";
    }

    function symbol() external pure returns (string memory) {
        return "PRES";
    }

    function balanceOf(address account) external view returns (uint256) {
        if (account == address(0)) revert ZeroAddress();
        return _badgeBalances[account];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address o = _tokenOwner[tokenId];
        if (o == address(0)) revert TokenDoesNotExist();
        return o;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        ownerOf(tokenId); // reverts for unknown tokens
        return _tierURIs[_tokenTier[tokenId]];
    }

    function tokenTier(uint256 tokenId) external view returns (uint256) {
        ownerOf(tokenId); // reverts for unknown tokens
        return _tokenTier[tokenId];
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x80ac58cd // ERC-721
            || interfaceId == 0x01ffc9a7; // ERC-165
    }

    // Soulbound: every transfer / approval path reverts.
    function transferFrom(address, address, uint256) external pure {
        revert Soulbound();
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert Soulbound();
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert Soulbound();
    }

    function approve(address, uint256) external pure {
        revert Soulbound();
    }

    function setApprovalForAll(address, bool) external pure {
        revert Soulbound();
    }

    // ------------------------------------------------------------------
    // Ownership (owner may only set tier URIs)
    // ------------------------------------------------------------------
    function setTierURI(uint256 tier, string calldata uri) external onlyOwner {
        if (tier < 1 || tier > 4) revert InvalidTier();
        _tierURIs[tier] = uri;
        emit TierURISet(tier, uri);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function renounceOwnership() external onlyOwner {
        emit OwnershipTransferred(owner, address(0));
        owner = address(0);
    }
}
