// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol"; 

contract NFT is ERC721URIStorage {
    //
    using Counters for Counters.Counter;
    Counters.Counter private tokenIds;
    uint256 public tokenCount;

     constructor() ERC721("Nolan Misteries", "NOMI") {}

     function mint(string memory _tokenURI) external returns (uint) {
        tokenIds.increment();
        tokenCount = tokenIds.current();
        _mint(msg.sender, tokenCount);
        _setTokenURI(tokenCount, _tokenURI);
        return tokenCount;
     }
}