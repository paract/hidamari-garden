// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * DawnSeed — 陽だまりの庭への参加証SBT（Soulbound Token）
 * ERC-1155 ベース・譲渡不可・ウォレット1つにつき1枚
 *
 * TOKEN ID の意味:
 *   0 = Seed（参加証の基本形）
 * 将来的にはロール昇格ごとにIDを分けることも可能
 */
contract DawnSeed is ERC1155, Ownable {

    // トークンID定義
    uint256 public constant SEED = 0;

    // ウォレットごとのミント済みフラグ（重複ミント防止）
    mapping(address => bool) public hasMinted;

    // イベント：新しいSeedが発行されたとき
    event SeedMinted(address indexed to, uint256 timestamp);

    constructor(string memory uri_) ERC1155(uri_) Ownable(msg.sender) {}

    // =========================================================
    // ミント（オーナー＝管理者のみ実行可能）
    // =========================================================

    /**
     * @dev 参加証SBTを発行する。1ウォレット1枚まで。
     * @param to 発行先ウォレットアドレス
     */
    function mintSeed(address to) external onlyOwner {
        require(!hasMinted[to], "DawnSeed: already minted for this wallet");

        hasMinted[to] = true;
        _mint(to, SEED, 1, "");

        emit SeedMinted(to, block.timestamp);
    }

    /**
     * @dev 複数アドレスにまとめてSBTを発行する（ホワイトリスト配布用）
     * @param recipients 発行先アドレスの配列
     */
    function batchMintSeed(address[] calldata recipients) external onlyOwner {
        for (uint256 i = 0; i < recipients.length; i++) {
            address to = recipients[i];
            if (!hasMinted[to]) {
                hasMinted[to] = true;
                _mint(to, SEED, 1, "");
                emit SeedMinted(to, block.timestamp);
            }
        }
    }

    // =========================================================
    // メタデータURIの更新（オーナーのみ）
    // =========================================================

    /**
     * @dev NFTメタデータのIPFS URIを更新する
     * @param newUri 新しいIPFS URI（例: ipfs://Qm.../）
     */
    function setURI(string memory newUri) external onlyOwner {
        _setURI(newUri);
    }

    // =========================================================
    // SBT制約：譲渡を完全に禁止する
    // =========================================================

    /**
     * @dev トークンの移動前フック。ミントとバーン以外の転送をすべて禁止する。
     *      from == address(0) → ミント（許可）
     *      to   == address(0) → バーン（許可）
     *      それ以外            → 転送（禁止）
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override {
        // ミント（from がゼロアドレス）とバーンのみ許可
        require(
            from == address(0) || to == address(0),
            "DawnSeed: Soulbound - transfer is not allowed"
        );
        super._update(from, to, ids, values);
    }
}
