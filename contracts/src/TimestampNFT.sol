// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {Strings} from "openzeppelin-contracts/contracts/utils/Strings.sol";
import {Base64} from "openzeppelin-contracts/contracts/utils/Base64.sol";

/**
 * @title TimestampNFT
 * @dev オンチェーンSVGでunixタイムスタンプを表示するNFT
 * 複数ミント可能、ユーザーガス負担
 */
contract TimestampNFT is ERC721, Ownable {
    using Strings for uint256;

    // トークンIDカウンター
    uint256 private _tokenIdCounter;

    // トークンIDごとのミント時刻を記録
    mapping(uint256 => uint256) public tokenTimestamps;

    // イベント
    event NFTMinted(address indexed to, uint256 indexed tokenId, uint256 timestamp);

    constructor() ERC721("Timestamp NFT", "TNFT") Ownable(msg.sender) {
        _tokenIdCounter = 0;
    }

    /**
     * @dev NFTをミントする（誰でも呼び出し可能、複数ミント可能）
     */
    function mint() public returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        uint256 timestamp = block.timestamp;
        tokenTimestamps[tokenId] = timestamp;

        _safeMint(msg.sender, tokenId);

        emit NFTMinted(msg.sender, tokenId, timestamp);

        return tokenId;
    }

    /**
     * @dev トークンURIを生成（オンチェーンSVG）
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        // OpenZeppelin ERC721 v5 では public の ownerOf はカスタムエラーで revert するため、
        // ここでは内部関数 _ownerOf を使って存在チェックを行い、独自メッセージで revert させる
        address owner = _ownerOf(tokenId);
        require(owner != address(0), "Token does not exist");

        uint256 timestamp = tokenTimestamps[tokenId];
        string memory svg = generateSvg(timestamp);
        string memory json = generateMetadata(tokenId, timestamp, svg);

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    /**
     * @dev SVGを生成
     */
    function generateSvg(uint256 timestamp) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" style="background:#0052FF">',
                '<text x="50%" y="40%" dominant-baseline="middle" text-anchor="middle" font-size="24" fill="white" font-family="monospace">',
                "Timestamp NFT",
                "</text>",
                '<text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-size="32" fill="white" font-family="monospace" font-weight="bold">',
                timestamp.toString(),
                "</text>",
                "</svg>"
            )
        );
    }

    /**
     * @dev メタデータJSONを生成
     */
    function generateMetadata(
        uint256 tokenId,
        uint256 timestamp,
        string memory svg
    ) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '{"name":"Timestamp NFT #',
                tokenId.toString(),
                '","description":"NFT minted at Unix timestamp ',
                timestamp.toString(),
                '","image":"data:image/svg+xml;base64,',
                Base64.encode(bytes(svg)),
                '"}'
            )
        );
    }

    /**
     * @dev 現在のトークンIDカウンターを取得
     */
    function getCurrentTokenId() public view returns (uint256) {
        return _tokenIdCounter;
    }
}


