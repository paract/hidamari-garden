// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

/**
 * BioNFT — 朝ツイ活デジタルガーデン（ATSDG）
 *
 * 仕様:
 *   - DawnSeed（SBT）保有者のみ mint 可能
 *   - ATS トークンを Treasury（運営金庫）へ移転することで 5 段階（0〜4）成長する dNFT
 *   - 消費した ATS は Burn せず treasuryAddress へ回収・リサイクルされる
 *   - ステージコストはオーナーが自由に変更可能（setStageCost）
 *   - tokenURI はステージに応じたメタデータを返す（dNFT）
 */
contract BioNFT is ERC721, ERC721Enumerable, ERC2981, Ownable, ReentrancyGuard {

    using Strings for uint256;

    // =========================================================
    // 定数・状態変数
    // =========================================================

    uint8 public constant MAX_STAGE = 4;

    // DawnSeed の SBT トークン ID（参加証）
    uint256 public constant SEED_TOKEN_ID = 0;

    // トークンごとの成長ステージ（0=Seed 〜 4=Ancient）
    mapping(uint256 => uint8) public stage;

    // ステージアップに必要な ATS コスト（ステージ番号 => ATS量 wei単位）
    // 例: stageCosts[1] = 30 * 10^18 → 30 ATS で Stage 0→1
    mapping(uint8 => uint256) public stageCosts;

    // 連携コントラクト
    IERC20   public immutable atsToken;
    IERC1155 public immutable dawnSeed;

    // ATS の回収先（運営金庫）アドレス
    address public treasuryAddress;

    // メタデータのベースURI（ステージごとに "{baseURI}{stage}.json" を返す）
    string private _baseTokenURI;

    // トークン ID の自動採番カウンター
    uint256 private _nextTokenId;

    // =========================================================
    // イベント
    // =========================================================

    event Minted(address indexed to, uint256 indexed tokenId);
    event Grown(uint256 indexed tokenId, uint8 fromStage, uint8 toStage, uint256 atsTransferred);
    event StageCostUpdated(uint8 indexed targetStage, uint256 newCost);
    event BaseURIUpdated(string newBaseURI);
    event TreasuryAddressUpdated(address indexed oldAddress, address indexed newAddress);

    // =========================================================
    // コンストラクタ
    // =========================================================

    /**
     * @param atsTokenAddress   デプロイ済み ATSToken のアドレス
     * @param dawnSeedAddress   デプロイ済み DawnSeed のアドレス
     * @param treasury          ATS の回収先となる Treasury アドレス
     */
    constructor(address atsTokenAddress, address dawnSeedAddress, address treasury)
        ERC721(unicode"朝ツイ活デジタルガーデン", "ATSDG")
        Ownable(msg.sender)
    {
        require(treasury != address(0), "BioNFT: treasury is zero address");

        atsToken        = IERC20(atsTokenAddress);
        dawnSeed        = IERC1155(dawnSeedAddress);
        treasuryAddress = treasury;

        // ロイヤリティ: 10%（二次流通時になおさんのウォレットへ自動送金）
        // 1000 = 10%（基準: 10000 = 100%）
        _setDefaultRoyalty(msg.sender, 1000);

        // 初期ステージコスト（ATS × 10^18 が実数値）
        // 設計: 1日3ATS配布 × 180日（半年）で大樹到達。合計540 ATS。
        stageCosts[1] = 30  * 10 ** 18; // 0→1 Sprout（新芽）:  30 ATS
        stageCosts[2] = 90  * 10 ** 18; // 1→2 Vine（若木）:    90 ATS
        stageCosts[3] = 180 * 10 ** 18; // 2→3 Bloom（開花）:  180 ATS
        stageCosts[4] = 240 * 10 ** 18; // 3→4 Ancient（大樹）: 240 ATS
    }

    // =========================================================
    // ミント（DawnSeed 保有者のみ）
    // =========================================================

    /**
     * @dev DawnSeed SBT を持つアドレスのみが BioNFT を 1 枚 mint できる。
     *      reentrancy 攻撃を防ぐため nonReentrant を付与。
     */
    function mint() external nonReentrant {
        require(
            dawnSeed.balanceOf(msg.sender, SEED_TOKEN_ID) > 0,
            "BioNFT: DawnSeed SBT not found"
        );

        uint256 tokenId = _nextTokenId++;
        stage[tokenId] = 0; // 初期ステージ: Seed（0）

        _safeMint(msg.sender, tokenId);
        emit Minted(msg.sender, tokenId);
    }

    // =========================================================
    // 成長（ATS を Treasury へ移転して次のステージへ）
    // =========================================================

    /**
     * @dev tokenId を 1 段階成長させる。
     *      ATS は Burn されず、treasuryAddress へ移転（回収・リサイクル）される。
     *      実行前に msg.sender は ATSToken.approve(BioNFTアドレス, cost) が必要。
     * @param tokenId 成長させる NFT の ID
     */
    function grow(uint256 tokenId) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "BioNFT: not token owner");

        uint8 currentStage = stage[tokenId];
        require(currentStage < MAX_STAGE, "BioNFT: already at max stage (Ancient)");

        uint8 nextStage = currentStage + 1;
        uint256 cost = stageCosts[nextStage];

        // ATS を msg.sender から treasuryAddress へ移転（要事前 approve）
        bool success = atsToken.transferFrom(msg.sender, treasuryAddress, cost);
        require(success, "BioNFT: ATS transfer to treasury failed");

        stage[tokenId] = nextStage;
        emit Grown(tokenId, currentStage, nextStage, cost);
    }

    // =========================================================
    // オーナー専用設定
    // =========================================================

    /**
     * @dev ステージアップのコスト（ATS量）を変更する。
     * @param targetStage  変更対象のステージ（1〜4）
     * @param newCost      新しいコスト（ATS の wei 単位、例: 30ATS → 30 * 10^18）
     */
    function setStageCost(uint8 targetStage, uint256 newCost) external onlyOwner {
        require(targetStage >= 1 && targetStage <= MAX_STAGE, "BioNFT: invalid stage number");
        stageCosts[targetStage] = newCost;
        emit StageCostUpdated(targetStage, newCost);
    }

    /**
     * @dev ATS の回収先アドレスを変更する。
     * @param newTreasury 新しい Treasury アドレス
     */
    function setTreasuryAddress(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "BioNFT: treasury is zero address");
        address old = treasuryAddress;
        treasuryAddress = newTreasury;
        emit TreasuryAddressUpdated(old, newTreasury);
    }

    /**
     * @dev ロイヤリティの受取先と割合を変更する（onlyOwner）。
     * @param recipient ロイヤリティ受取アドレス
     * @param feeNumerator 割合（1000 = 10%、基準は10000）
     */
    function setDefaultRoyalty(address recipient, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(recipient, feeNumerator);
    }

    /**
     * @dev dNFT メタデータのベース URI を更新する。
     *      ステージ別ファイル名: {baseURI}0.json 〜 {baseURI}4.json
     * @param newBaseURI 新しいベース URI（例: ipfs://Qm.../）
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    // =========================================================
    // ERC721 メタデータ（ステージに応じた dNFT URI）
    // =========================================================

    /**
     * @dev ステージに応じたメタデータ URI を返す。
     *      例: baseURI="ipfs://Qm.../" かつ stage=2 → "ipfs://Qm.../2.json"
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string(abi.encodePacked(_baseTokenURI, uint256(stage[tokenId]).toString(), ".json"));
    }

    // =========================================================
    // ERC721Enumerable との多重継承解消（必須オーバーライド）
    // =========================================================

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
