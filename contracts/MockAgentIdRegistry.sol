// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MockAgentIdRegistry
/// @notice Minimal stand-in for the official Binance Agent ID registry,
///         used ONLY for local tests. Anyone can mint a fake "Agent ID"
///         to any address here — never deploy this to a live network.
contract MockAgentIdRegistry {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    uint256 private _nextTokenId = 1;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;

    function mint(address to) external returns (uint256 tokenId) {
        require(to != address(0), "mint to zero address");
        tokenId = _nextTokenId++;
        _owners[tokenId] = to;
        _balances[to] += 1;
        emit Transfer(address(0), to, tokenId);
    }

    function balanceOf(address account) external view returns (uint256) {
        require(account != address(0), "balance of zero address");
        return _balances[account];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address o = _owners[tokenId];
        require(o != address(0), "token does not exist");
        return o;
    }
}
