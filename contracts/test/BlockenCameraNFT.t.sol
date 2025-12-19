// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BlockenCameraNFT} from "../src/BlockenCameraNFT.sol";

contract BlockenCameraNFTTest is Test {
    BlockenCameraNFT public nft;
    address public owner;
    address public user1;
    address public user2;

    // テスト用のSVGデータ
    string constant VALID_SVG =
        '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><rect fill="#fff"/></svg>';
    string constant EMPTY_SVG = "";

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);

        nft = new BlockenCameraNFT();

        // テスト用にETHを配布
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
    }

    // ETHの受信を許可
    receive() external payable {}

    // ========== 基本機能テスト ==========

    function testDeployment() public view {
        assertEq(nft.name(), "Blocken Camera NFT");
        assertEq(nft.symbol(), "BLOCKEN");
        assertEq(nft.owner(), owner);
        assertEq(nft.getCurrentTokenId(), 0);
        assertEq(nft.platformFee(), 0);
    }

    function testMintWithValidSvg() public {
        vm.prank(user1);
        uint256 tokenId = nft.mint(VALID_SVG);

        assertEq(tokenId, 0);
        assertEq(nft.ownerOf(0), user1);
        assertEq(nft.getCurrentTokenId(), 1);
        assertTrue(nft.tokenTimestamps(0) > 0);
        assertEq(nft.getSvgData(0), VALID_SVG);
    }

    function testMintWithEmptySvg() public {
        vm.prank(user1);
        vm.expectRevert("SVG data cannot be empty");
        nft.mint(EMPTY_SVG);
    }

    function testMintWithLargeSvg() public {
        // 100KB以上のSVGを生成
        string memory largeSvg = new string(100001);
        vm.prank(user1);
        vm.expectRevert("SVG data too large (max 100KB)");
        nft.mint(largeSvg);
    }

    function testMultipleMints() public {
        vm.prank(user1);
        nft.mint(VALID_SVG);

        vm.prank(user1);
        nft.mint(VALID_SVG);

        vm.prank(user2);
        nft.mint(VALID_SVG);

        assertEq(nft.ownerOf(0), user1);
        assertEq(nft.ownerOf(1), user1);
        assertEq(nft.ownerOf(2), user2);
        assertEq(nft.getCurrentTokenId(), 3);
    }

    // ========== 手数料機能テスト ==========

    function testMintWithInsufficientFee() public {
        // 手数料を0.001 ETHに設定
        nft.setPlatformFee(0.001 ether);

        vm.prank(user1);
        vm.expectRevert("Insufficient platform fee");
        nft.mint{value: 0.0005 ether}(VALID_SVG);
    }

    function testMintWithExactFee() public {
        // 手数料を0.001 ETHに設定
        nft.setPlatformFee(0.001 ether);

        vm.prank(user1);
        uint256 tokenId = nft.mint{value: 0.001 ether}(VALID_SVG);

        assertEq(tokenId, 0);
        assertEq(address(nft).balance, 0.001 ether);
    }

    function testMintWithExcessFee() public {
        // 手数料を0.001 ETHに設定
        nft.setPlatformFee(0.001 ether);

        vm.prank(user1);
        uint256 tokenId = nft.mint{value: 0.002 ether}(VALID_SVG);

        assertEq(tokenId, 0);
        assertEq(address(nft).balance, 0.002 ether);
    }

    function testSetPlatformFee() public {
        uint256 newFee = 0.005 ether;

        vm.expectEmit(true, true, true, true);
        emit BlockenCameraNFT.PlatformFeeUpdated(0, newFee);

        nft.setPlatformFee(newFee);

        assertEq(nft.platformFee(), newFee);
    }

    function testSetPlatformFeeNonOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        nft.setPlatformFee(0.001 ether);
    }

    // ========== 資金管理テスト ==========

    function testWithdraw() public {
        // 手数料を設定してmint
        nft.setPlatformFee(0.001 ether);

        vm.prank(user1);
        nft.mint{value: 0.001 ether}(VALID_SVG);

        uint256 ownerBalanceBefore = owner.balance;
        uint256 contractBalance = address(nft).balance;

        vm.expectEmit(true, true, true, true);
        emit BlockenCameraNFT.FundsWithdrawn(owner, contractBalance);

        nft.withdraw();

        assertEq(address(nft).balance, 0);
        assertEq(owner.balance, ownerBalanceBefore + contractBalance);
    }

    function testWithdrawNonOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        nft.withdraw();
    }

    function testWithdrawWithZeroBalance() public {
        vm.expectRevert("No funds to withdraw");
        nft.withdraw();
    }

    // ========== tokenURI生成テスト ==========

    function testTokenURI() public {
        vm.prank(user1);
        nft.mint(VALID_SVG);

        string memory uri = nft.tokenURI(0);
        assertTrue(bytes(uri).length > 0);
        assertTrue(keccak256(bytes(uri)) != keccak256(bytes("")));

        // data:application/json;base64で始まることを確認
        bytes memory uriBytes = bytes(uri);
        bytes memory prefix = bytes("data:application/json;base64,");
        bool hasCorrectPrefix = true;
        for (uint256 i = 0; i < prefix.length; i++) {
            if (uriBytes[i] != prefix[i]) {
                hasCorrectPrefix = false;
                break;
            }
        }
        assertTrue(hasCorrectPrefix);
    }

    function testTokenURINonExistentToken() public {
        vm.expectRevert("Token does not exist");
        nft.tokenURI(999);
    }

    function testGetSvgData() public {
        vm.prank(user1);
        nft.mint(VALID_SVG);

        string memory retrievedSvg = nft.getSvgData(0);
        assertEq(retrievedSvg, VALID_SVG);
    }

    function testGetSvgDataNonExistentToken() public {
        vm.expectRevert("Token does not exist");
        nft.getSvgData(999);
    }

    // ========== イベントテスト ==========

    function testNFTMintedEvent() public {
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit BlockenCameraNFT.NFTMinted(user1, 0, block.timestamp, 0);
        nft.mint(VALID_SVG);
    }

    function testPlatformFeeUpdatedEvent() public {
        uint256 oldFee = 0;
        uint256 newFee = 0.001 ether;

        vm.expectEmit(true, true, true, true);
        emit BlockenCameraNFT.PlatformFeeUpdated(oldFee, newFee);
        nft.setPlatformFee(newFee);
    }

    function testFundsWithdrawnEvent() public {
        // 手数料を設定してmint
        nft.setPlatformFee(0.001 ether);

        vm.prank(user1);
        nft.mint{value: 0.001 ether}(VALID_SVG);

        uint256 balance = address(nft).balance;

        vm.expectEmit(true, true, true, true);
        emit BlockenCameraNFT.FundsWithdrawn(owner, balance);
        nft.withdraw();
    }

    // ========== 統合テスト ==========

    function testFullMintingFlow() public {
        // 手数料を設定
        nft.setPlatformFee(0.001 ether);

        // ユーザー1が2つミント
        vm.startPrank(user1);
        uint256 tokenId1 = nft.mint{value: 0.001 ether}(VALID_SVG);
        uint256 tokenId2 = nft.mint{value: 0.001 ether}(VALID_SVG);
        vm.stopPrank();

        // ユーザー2が1つミント
        vm.prank(user2);
        uint256 tokenId3 = nft.mint{value: 0.001 ether}(VALID_SVG);

        // 所有権の確認
        assertEq(nft.ownerOf(tokenId1), user1);
        assertEq(nft.ownerOf(tokenId2), user1);
        assertEq(nft.ownerOf(tokenId3), user2);

        // コントラクト残高の確認
        assertEq(address(nft).balance, 0.003 ether);

        // tokenURIの確認
        assertTrue(bytes(nft.tokenURI(tokenId1)).length > 0);
        assertTrue(bytes(nft.tokenURI(tokenId2)).length > 0);
        assertTrue(bytes(nft.tokenURI(tokenId3)).length > 0);

        // 資金引き出し
        uint256 ownerBalanceBefore = owner.balance;
        nft.withdraw();
        assertEq(owner.balance, ownerBalanceBefore + 0.003 ether);
        assertEq(address(nft).balance, 0);
    }

    // ========== receive関数のテスト ==========

    function testReceiveEth() public {
        vm.prank(user1);
        (bool success, ) = address(nft).call{value: 1 ether}("");
        assertTrue(success);
        assertEq(address(nft).balance, 1 ether);
    }
}
