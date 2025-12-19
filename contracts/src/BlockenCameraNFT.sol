// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {Strings} from "openzeppelin-contracts/contracts/utils/Strings.sol";
import {Base64} from "openzeppelin-contracts/contracts/utils/Base64.sol";

/**
 * @title BlockenCameraNFT
 * @dev ASCII Camera NFTをオンチェーンで完全保存するコントラクト
 * SVG画像をブロックチェーン上に永続的に保存し、
 * プラットフォーム手数料の管理機能を提供します。
 */
contract BlockenCameraNFT is ERC721, Ownable {
    using Strings for uint256;

    // トークンIDカウンター
    uint256 private _tokenIdCounter;

    // プラットフォーム手数料（Wei単位、初期値0 ETH）
    uint256 public platformFee;

    // トークンIDごとのSVGデータを記録
    mapping(uint256 => string) private tokenSvgData;

    // トークンIDごとのミント時刻を記録
    mapping(uint256 => uint256) public tokenTimestamps;

    // イベント
    event NFTMinted(
        address indexed to,
        uint256 indexed tokenId,
        uint256 timestamp,
        uint256 fee
    );

    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);

    event FundsWithdrawn(address indexed owner, uint256 amount);

    /**
     * @dev コンストラクタ
     * NFT名を"Blocken Camera NFT"、シンボルを"BLOCKEN"に設定
     * プラットフォーム手数料の初期値は0 ETH
     */
    constructor() ERC721("Blocken Camera NFT", "BLOCKEN") Ownable(msg.sender) {
        _tokenIdCounter = 0;
        platformFee = 0;
    }

    /**
     * @dev SVGデータを受け取ってNFTをミント
     * @param svgData SVG文字列（フロントエンドで生成されたもの）
     * @return tokenId ミントされたトークンID
     */
    function mint(string calldata svgData) public payable returns (uint256) {
        // プラットフォーム手数料のチェック
        require(msg.value >= platformFee, "Insufficient platform fee");

        // SVGデータの基本的なバリデーション
        require(bytes(svgData).length > 0, "SVG data cannot be empty");
        require(
            bytes(svgData).length <= 100000,
            "SVG data too large (max 100KB)"
        );

        // トークンIDの生成
        uint256 tokenId = _tokenIdCounter;
        unchecked {
            _tokenIdCounter++;
        }

        // データの保存
        uint256 timestamp = block.timestamp;
        tokenSvgData[tokenId] = svgData;
        tokenTimestamps[tokenId] = timestamp;

        // NFTのミント
        _safeMint(msg.sender, tokenId);

        // イベント発火
        emit NFTMinted(msg.sender, tokenId, timestamp, msg.value);

        return tokenId;
    }

    /**
     * @dev トークンURIを生成（オンチェーンSVG + メタデータ）
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        // トークン存在チェック
        address owner = _ownerOf(tokenId);
        require(owner != address(0), "Token does not exist");

        string memory svgData = tokenSvgData[tokenId];
        uint256 timestamp = tokenTimestamps[tokenId];

        // メタデータJSON生成
        string memory json = generateMetadata(tokenId, timestamp, svgData);

        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(bytes(json))
                )
            );
    }

    /**
     * @dev メタデータJSONを生成
     */
    function generateMetadata(
        uint256 tokenId,
        uint256 timestamp,
        string memory svgData
    ) internal pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    '{"name":"Blocken Camera NFT #',
                    tokenId.toString(),
                    '","description":"ASCII art camera NFT stored entirely on-chain. Minted at ',
                    timestamp.toString(),
                    '","image":"data:image/svg+xml;base64,',
                    Base64.encode(bytes(svgData)),
                    '","attributes":[',
                    '{"trait_type":"Mint Timestamp","value":"',
                    timestamp.toString(),
                    '"}',
                    "]}"
                )
            );
    }

    /**
     * @dev プラットフォーム手数料を設定（オーナーのみ）
     * @param newFee 新しい手数料（Wei単位）
     */
    function setPlatformFee(uint256 newFee) public onlyOwner {
        uint256 oldFee = platformFee;
        platformFee = newFee;
        emit PlatformFeeUpdated(oldFee, newFee);
    }

    /**
     * @dev 蓄積された手数料を引き出す（オーナーのみ）
     */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(owner(), balance);
    }

    /**
     * @dev 現在のトークンIDカウンターを取得
     */
    function getCurrentTokenId() public view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev 特定トークンのSVGデータを取得
     */
    function getSvgData(uint256 tokenId) public view returns (string memory) {
        address owner = _ownerOf(tokenId);
        require(owner != address(0), "Token does not exist");
        return tokenSvgData[tokenId];
    }

    /**
     * @dev ETHの受信を許可
     */
    receive() external payable {}
}
