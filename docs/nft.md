# NFTミント機能実装ガイド（Foundry版）

このドキュメントは、Farcaster Mini AppにBase上でNFTをミントする機能を追加するための完全なガイドです。

## 概要

このプロジェクトでは、以下の機能を実装します：

- **オンチェーンSVG NFT**: unixタイムスタンプをテキストとして表示するシンプルなNFT
- **複数ミント可能**: 1ユーザーが複数のNFTをミント可能
- **ユーザーガス負担**: シンプルなトランザクションモデル
- **Base Sepolia & Mainnet対応**: テストネットと本番環境の両方に対応

## アーキテクチャ

```
┌─────────────────────┐
│   Mini App UI       │
│  (React/Next.js)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  OnchainKit +       │
│  Wagmi              │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  TimestampNFT.sol   │
│  (ERC721 Contract)  │
│  Base Chain         │
└─────────────────────┘
```

---

## フェーズ1: Foundry環境のセットアップ

### 1.1 Foundryのインストール

Foundryは高速なSolidityスマートコントラクト開発ツールチェーンです。

**macOS / Linux の場合:**

```bash
# Foundryupをインストール
curl -L https://foundry.paradigm.xyz | bash

# ターミナルを再起動してから、Foundryをインストール
foundryup
```

**Windows の場合:**

Windows Subsystem for Linux (WSL) を使用する必要があります。

```bash
# WSLをインストール（PowerShellで実行）
wsl --install

# WSL内で上記のmacOS/Linuxの手順を実行
```

**インストール確認:**

```bash
forge --version
cast --version
anvil --version
chisel --version
```

### 1.2 プロジェクトの初期化

既存のMini Appプロジェクトのルートディレクトリで実行：

```bash
# Foundryプロジェクトを初期化
forge init --no-git contracts

# contracts ディレクトリに移動
cd contracts
```

**注意**: `--no-git` オプションは、既存のGitリポジトリ内で実行する場合に使用します。

### 1.3 ディレクトリ構造

```
.
├── app/                    # Next.jsアプリケーション（既存）
├── contracts/              # Foundryプロジェクト（新規）
│   ├── src/
│   │   └── TimestampNFT.sol
│   ├── test/
│   │   └── TimestampNFT.t.sol
│   ├── script/
│   │   └── Deploy.s.sol
│   ├── lib/                # 依存関係（Git submodules）
│   ├── foundry.toml        # Foundry設定ファイル
│   └── .env                # 環境変数
├── package.json
└── .env.local              # Next.js環境変数
```

### 1.4 環境変数の設定

`contracts/.env`ファイルを作成：

```bash
# Wallet Private Key (テスト用ウォレットを使用すること！)
PRIVATE_KEY=your_private_key_here

# RPC URLs
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org

# Basescan API Key (検証用)
BASESCAN_API_KEY=your_basescan_api_key
```

**セキュリティ注意事項：**
- `contracts/.env`を`.gitignore`に追加
- テスト用の新しいウォレットを使用（本番ウォレットは使わない）
- Base Sepoliaのテストネット用ETHをFaucetから取得: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

`.gitignore`に以下を追加：

```
contracts/.env
contracts/broadcast/
contracts/cache/
contracts/out/
```

### 1.5 Foundry設定ファイルの作成

`contracts/foundry.toml`を以下の内容で作成：

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.23"

# RPC エンドポイント
[rpc_endpoints]
base = "https://mainnet.base.org"
baseSepolia = "https://sepolia.base.org"

# Etherscan (Basescan) 設定
[etherscan]
baseSepolia = { key = "${BASESCAN_API_KEY}", url = "https://api-sepolia.basescan.org/api" }
base = { key = "${BASESCAN_API_KEY}", url = "https://api.basescan.org/api" }

# オプティマイザ設定
optimizer = true
optimizer_runs = 200

# テスト設定
[profile.default.fuzz]
runs = 256
```

---

## フェーズ2: ERC721コントラクトの作成

### 2.1 OpenZeppelin Contractsのインストール

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```

これにより、`contracts/lib/openzeppelin-contracts`にOpenZeppelinライブラリがインストールされます。

### 2.2 TimestampNFT.solの作成

`contracts/src/TimestampNFT.sol`を作成：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";
import "openzeppelin-contracts/contracts/utils/Strings.sol";
import "openzeppelin-contracts/contracts/utils/Base64.sol";

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
        require(ownerOf(tokenId) != address(0), "Token does not exist");

        uint256 timestamp = tokenTimestamps[tokenId];
        string memory svg = generateSVG(timestamp);
        string memory json = generateMetadata(tokenId, timestamp, svg);

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    /**
     * @dev SVGを生成
     */
    function generateSVG(uint256 timestamp) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" style="background:#0052FF">',
                '<text x="50%" y="40%" dominant-baseline="middle" text-anchor="middle" font-size="24" fill="white" font-family="monospace">',
                'Timestamp NFT',
                '</text>',
                '<text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-size="32" fill="white" font-family="monospace" font-weight="bold">',
                timestamp.toString(),
                '</text>',
                '</svg>'
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
```

### 2.3 コントラクトのコンパイル

```bash
cd contracts
forge build
```

成功すると、`contracts/out/`ディレクトリにコンパイル済みのコントラクトが生成されます。

---

## フェーズ3: コントラクトのテスト

### 3.1 テストファイルの作成

`contracts/test/TimestampNFT.t.sol`を作成：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/TimestampNFT.sol";

contract TimestampNFTTest is Test {
    TimestampNFT public nft;
    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);

        nft = new TimestampNFT();
    }

    function testDeployment() public view {
        assertEq(nft.name(), "Timestamp NFT");
        assertEq(nft.symbol(), "TNFT");
        assertEq(nft.owner(), owner);
        assertEq(nft.getCurrentTokenId(), 0);
    }

    function testMint() public {
        vm.prank(user1);
        uint256 tokenId = nft.mint();

        assertEq(tokenId, 0);
        assertEq(nft.ownerOf(0), user1);
        assertEq(nft.getCurrentTokenId(), 1);
        assertTrue(nft.tokenTimestamps(0) > 0);
    }

    function testMultipleMints() public {
        vm.prank(user1);
        nft.mint();

        vm.prank(user1);
        nft.mint();

        vm.prank(user2);
        nft.mint();

        assertEq(nft.ownerOf(0), user1);
        assertEq(nft.ownerOf(1), user1);
        assertEq(nft.ownerOf(2), user2);
        assertEq(nft.getCurrentTokenId(), 3);
    }

    function testTokenURI() public {
        vm.prank(user1);
        nft.mint();

        string memory uri = nft.tokenURI(0);
        assertTrue(bytes(uri).length > 0);
        assertTrue(
            keccak256(bytes(uri)) != keccak256(bytes(""))
        );
    }

    function testTokenURIForNonExistentToken() public {
        vm.expectRevert("Token does not exist");
        nft.tokenURI(999);
    }

    function testNFTMintedEvent() public {
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit TimestampNFT.NFTMinted(user1, 0, block.timestamp);
        nft.mint();
    }
}
```

### 3.2 テストの実行

```bash
cd contracts

# すべてのテストを実行
forge test

# 詳細なログ付きで実行
forge test -vv

# ガスレポートを表示
forge test --gas-report

# カバレッジを確認
forge coverage
```

成功すると以下のような出力が表示されます：

```
Running 6 tests for test/TimestampNFT.t.sol:TimestampNFTTest
[PASS] testDeployment() (gas: 12345)
[PASS] testMint() (gas: 98765)
[PASS] testMultipleMints() (gas: 234567)
[PASS] testTokenURI() (gas: 345678)
[PASS] testTokenURIForNonExistentToken() (gas: 12345)
[PASS] testNFTMintedEvent() (gas: 98765)
Test result: ok. 6 passed; 0 failed; finished in 2.34ms
```

---

## フェーズ4: Base Sepoliaへのデプロイ

### 4.1 デプロイスクリプトの作成

`contracts/script/Deploy.s.sol`を作成：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/TimestampNFT.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        TimestampNFT nft = new TimestampNFT();

        console.log("TimestampNFT deployed to:", address(nft));
        console.log("Deployer:", msg.sender);
        console.log("Block number:", block.number);

        vm.stopBroadcast();
    }
}
```

### 4.2 環境変数の読み込み

```bash
cd contracts

# .envファイルを読み込む
source .env
```

### 4.3 Base Sepoliaにデプロイ

```bash
# デプロイ（シミュレーション）
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL

# 実際にデプロイ
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

**注意**: `--verify`オプションを使用すると、デプロイと同時にBasescanで検証されます。

デプロイが成功すると、以下のような出力が表示されます：

```
== Logs ==
  TimestampNFT deployed to: 0x1234567890abcdef1234567890abcdef12345678
  Deployer: 0xYourWalletAddress
  Block number: 12345678

##### base-sepolia
✅  [Success]Hash: 0xabcdef...
Contract Address: 0x1234567890abcdef1234567890abcdef12345678
```

**コントラクトアドレスをメモしてください！**

### 4.4 手動でのコントラクト検証（必要な場合）

デプロイ時に自動検証されなかった場合：

```bash
forge verify-contract \
  <CONTRACT_ADDRESS> \
  src/TimestampNFT.sol:TimestampNFT \
  --chain-id 84532 \
  --etherscan-api-key $BASESCAN_API_KEY \
  --watch
```

### 4.5 動作確認

Basescan Sepoliaで確認：
1. https://sepolia.basescan.org/address/<CONTRACT_ADDRESS> にアクセス
2. "Contract" タブで検証済みであることを確認
3. "Write Contract" タブで "Connect to Web3" をクリック
4. `mint()` 関数を実行してテスト
5. "Read Contract" タブで `tokenURI(0)` を確認

---

## フェーズ5: Mini App UIの実装

### 5.1 環境変数の追加

プロジェクトルートの`.env.local`に以下を追加：

```bash
# Base Sepoliaのコントラクトアドレス
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_SEPOLIA=0x...

# Base Mainnetのコントラクトアドレス（後でデプロイ後に追加）
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_MAINNET=0x...

# 使用するネットワーク (development | production)
NEXT_PUBLIC_ENVIRONMENT=development
```

### 5.2 コントラクトABIの準備

`app/contracts/timestampNFTABI.ts`を作成：

```typescript
export const timestampNFTABI = [
  {
    inputs: [],
    name: "mint",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCurrentTokenId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "to", type: "address" },
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "NFTMinted",
    type: "event",
  },
] as const;
```

### 5.3 Mintコンポーネントの作成

`app/components/MintNFT.tsx`を作成：

```typescript
"use client";
import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { baseSepolia, base } from "wagmi/chains";
import { timestampNFTABI } from "../contracts/timestampNFTABI";
import styles from "./MintNFT.module.css";

const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === "development";
const contractAddress = isDev
  ? (process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_SEPOLIA as `0x${string}`)
  : (process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_MAINNET as `0x${string}`);

export function MintNFT() {
  const { address, isConnected } = useAccount();
  const [mintedTokenId, setMintedTokenId] = useState<bigint | null>(null);

  const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handleMint = async () => {
    if (!isConnected) {
      alert("ウォレットを接続してください");
      return;
    }

    try {
      writeContract({
        address: contractAddress,
        abi: timestampNFTABI,
        functionName: "mint",
        chain: isDev ? baseSepolia : base,
      });
    } catch (err) {
      console.error("ミントエラー:", err);
    }
  };

  // トランザクション確認後の処理
  if (isConfirmed && !mintedTokenId && hash) {
    // 成功時の処理（必要に応じてトークンIDを取得）
    setMintedTokenId(BigInt(0)); // 実際にはイベントから取得するのが理想
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Timestamp NFTをミント</h2>
      <p className={styles.description}>
        現在のUnixタイムスタンプが記録されたNFTをミントします。
        <br />
        ガス代はユーザー負担です。
      </p>

      {writeError && (
        <p className={styles.error}>
          エラー: {writeError.message}
        </p>
      )}

      {isConfirmed && (
        <p className={styles.success}>
          ✅ NFTのミントに成功しました！
        </p>
      )}

      {isConfirming && (
        <p className={styles.loading}>
          ⏳ トランザクションを確認中...
        </p>
      )}

      <button
        onClick={handleMint}
        disabled={!isConnected || isPending || isConfirming}
        className={styles.mintButton}
      >
        {!isConnected
          ? "ウォレットを接続してください"
          : isPending || isConfirming
          ? "ミント中..."
          : "NFTをミント"}
      </button>

      {isDev && (
        <p className={styles.devNote}>
          🔧 開発モード: Base Sepolia Testnet
        </p>
      )}

      {hash && (
        <div className={styles.txInfo}>
          <p className={styles.txHash}>
            トランザクション:{" "}
            <a
              href={`https://${isDev ? "sepolia." : ""}basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Basescanで確認
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
```

### 5.4 スタイルの追加

`app/components/MintNFT.module.css`を作成：

```css
.container {
  max-width: 500px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: #0052ff;
}

.description {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.mintButton {
  width: 100%;
  padding: 1rem;
  font-size: 1rem;
  font-weight: bold;
  color: white;
  background: #0052ff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.mintButton:hover:not(:disabled) {
  background: #0041cc;
}

.mintButton:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error {
  color: #d32f2f;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #ffebee;
  border-radius: 4px;
}

.success {
  color: #388e3c;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #e8f5e9;
  border-radius: 4px;
}

.loading {
  color: #f57c00;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #fff3e0;
  border-radius: 4px;
}

.devNote {
  font-size: 0.8rem;
  color: #666;
  margin-top: 1rem;
  padding: 0.5rem;
  background: #f5f5f5;
  border-radius: 4px;
  text-align: center;
}

.txInfo {
  margin-top: 1rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 4px;
}

.txHash {
  font-size: 0.8rem;
  word-break: break-all;
}

.txHash a {
  color: #0052ff;
  text-decoration: underline;
}
```

### 5.5 ページに組み込む

`app/page.tsx`に`MintNFT`コンポーネントを追加：

```typescript
import { MintNFT } from "./components/MintNFT";

// 既存のコードに追加
<div className={styles.content}>
  {/* 既存のコンテンツ */}
  
  {/* NFTミントコンポーネントを追加 */}
  <MintNFT />
</div>
```

### 5.6 ローカルでテスト

```bash
# プロジェクトルートで実行
npm run dev
```

ブラウザで`http://localhost:3000`にアクセスし、以下を確認：
1. ウォレット接続
2. "NFTをミント"ボタンをクリック
3. ウォレットでトランザクションを承認
4. ガス代を支払ってミント
5. Basescan Sepoliaでトランザクションを確認

---

## フェーズ6: 本番環境へのデプロイ

### 6.1 Base Mainnetにコントラクトをデプロイ

```bash
cd contracts

# 環境変数を確認
echo $BASE_MAINNET_RPC_URL
echo $PRIVATE_KEY

# Base Mainnetにデプロイ
forge script script/Deploy.s.sol \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

**注意**: Base Mainnetへのデプロイには実際のETHが必要です。

### 6.2 Vercelの環境変数を更新

Vercelダッシュボードで以下の環境変数を追加：

```
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_MAINNET=0x... (本番のコントラクトアドレス)
NEXT_PUBLIC_ENVIRONMENT=production
```

### 6.3 Vercelに再デプロイ

```bash
# プロジェクトルートで実行
vercel --prod
```

### 6.4 本番環境で動作確認

1. デプロイされたURLにアクセス
2. ウォレットを接続（Base Mainnet）
3. NFTをミント
4. Basescanで確認: `https://basescan.org/address/<CONTRACT_ADDRESS>`

---

## トラブルシューティング

### よくある問題と解決方法

#### 1. Foundryのインストールエラー

**エラー**: `command not found: foundryup`

**解決方法**:
```bash
# パスを確認
echo $PATH

# .bashrc または .zshrc に以下を追加
export PATH="$HOME/.foundry/bin:$PATH"

# ターミナルを再起動
source ~/.bashrc  # または source ~/.zshrc
```

#### 2. Git Submodulesのエラー

**エラー**: `Error: No such file or directory: lib/openzeppelin-contracts`

**解決方法**:
```bash
cd contracts
git submodule update --init --recursive
```

#### 3. デプロイ時のガス不足

**エラー**: `insufficient funds for gas * price + value`

**解決方法**:
- Base Sepolia: Faucetからテストネット用ETHを取得
- Base Mainnet: ウォレットに十分なETHがあるか確認

#### 4. コントラクト検証の失敗

**エラー**: `Verification failed`

**解決方法**:
```bash
# コンパイラバージョンを確認
forge --version

# foundry.tomlのsolc_versionと一致させる
# 検証コマンドを再実行
forge verify-contract <CONTRACT_ADDRESS> \
  src/TimestampNFT.sol:TimestampNFT \
  --chain-id 84532 \
  --etherscan-api-key $BASESCAN_API_KEY
```

#### 5. トランザクションがRevertする

**デバッグ方法**:
```bash
# ローカルのAnvilノードを起動
anvil

# 別のターミナルでデプロイしてテスト
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

#### 6. ABIの型エラー

**エラー**: `Type 'readonly [...]' is not assignable to type 'Abi'`

**解決方法**:
ABIの定義に`as const`を追加：
```typescript
export const timestampNFTABI = [...] as const;
```

---

## Foundryの便利なコマンド

### コントラクト開発

```bash
# コンパイル
forge build

# クリーンビルド
forge clean && forge build

# テスト実行
forge test

# 特定のテストのみ実行
forge test --match-test testMint

# ガスレポート
forge test --gas-report

# カバレッジ
forge coverage
```

### デバッグとインタラクション

```bash
# ローカルノードを起動
anvil

# コントラクトの関数を呼び出す（read）
cast call <CONTRACT_ADDRESS> "getCurrentTokenId()" --rpc-url $BASE_SEPOLIA_RPC_URL

# コントラクトの関数を実行（write）
cast send <CONTRACT_ADDRESS> "mint()" --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $PRIVATE_KEY

# アカウント残高を確認
cast balance <ADDRESS> --rpc-url $BASE_SEPOLIA_RPC_URL

# トランザクションの詳細を確認
cast tx <TX_HASH> --rpc-url $BASE_SEPOLIA_RPC_URL
```

### 依存関係管理

```bash
# 依存関係をインストール
forge install <GITHUB_REPO>

# 依存関係を更新
forge update

# 依存関係を削除
forge remove <PACKAGE_NAME>
```

---

## 次のステップ

### 機能拡張のアイデア

1. **NFTギャラリー**: ユーザーがミントしたNFTの一覧を表示
2. **カスタムメタデータ**: ユーザーが任意のテキストを入力できるようにする
3. **レアリティ**: 特定の時間帯にミントしたNFTに特別なデザインを適用
4. **アローリスト**: 特定のFIDのユーザーのみミント可能にする
5. **バーン機能**: NFTを焼却して新しいNFTをミントする

### セキュリティ強化

1. **レート制限**: 1ユーザーあたりの最大ミント数を制限
2. **一時停止機能**: 緊急時にミントを停止できる`pause()`関数を追加
3. **アクセス制御**: OpenZeppelinの`AccessControl`を使用したRole-based access control

### ガス最適化

1. **ERC721A**: バッチミント時のガス効率化
2. **ストレージ最適化**: `tokenTimestamps`をpackingで最適化
3. **カスタムエラー**: `require`の代わりにカスタムエラーを使用

例：
```solidity
// カスタムエラーの定義
error TokenDoesNotExist(uint256 tokenId);

// 使用例
function tokenURI(uint256 tokenId) public view override returns (string memory) {
    if (ownerOf(tokenId) == address(0)) {
        revert TokenDoesNotExist(tokenId);
    }
    // ...
}
```

---

## 参考リソース

- [Foundry Book](https://book.getfoundry.sh/)
- [Base公式ドキュメント](https://docs.base.org/)
- [Base Foundryチュートリアル](https://docs.base.org/learn/foundry/setup-with-base)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Wagmi ドキュメント](https://wagmi.sh/)
- [Basescan](https://basescan.org/)
- [Basescan Sepolia](https://sepolia.basescan.org/)

---

## HardhatからFoundryへの移行について

以前Hardhatを使用していた場合、以下の点が変更されています：

### 主な違い

| 項目 | Hardhat | Foundry |
|------|---------|---------|
| 言語 | TypeScript/JavaScript | Solidity |
| テスト | Mocha/Chai | Forge (Solidity) |
| 依存関係 | npm/yarn | Git submodules |
| コンパイル | `npx hardhat compile` | `forge build` |
| テスト | `npx hardhat test` | `forge test` |
| デプロイ | TypeScript script | Solidity script |
| 速度 | 遅い | 非常に高速（Rust製） |

### 移行のメリット

1. **高速**: Foundryは非常に高速で、大規模プロジェクトでも数秒でコンパイル
2. **統一**: テストもデプロイもすべてSolidityで記述可能
3. **Cheatcodes**: 強力なテストユーティリティ（`vm.prank`, `vm.expectRevert`など）
4. **ガスレポート**: 組み込みのガス最適化ツール

---

## まとめ

このガイドに従うことで、以下を達成できます：

✅ Foundryでスマートコントラクト開発環境を構築
✅ オンチェーンSVGのERC721 NFTコントラクトを作成
✅ Solidityでテストを記述して実行
✅ Base SepoliaとMainnetにデプロイ
✅ Farcaster Mini AppでNFTをミント（ユーザーガス負担）
✅ シンプルで理解しやすいトランザクションフロー

Foundryの高速な開発サイクルで、効率的にスマートコントラクトを開発できます！

質問やフィードバックがあれば、GitHubのIssueで報告してください！
