// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * ATSToken — ATSCoin（ATSC）
 *
 * 特徴:
 *   - 総供給上限 1,000,000 ATSC を constructor でまとめて発行（追加発行なし）
 *   - ERC20Burnable により burn / burnFrom（残高削減）に対応
 *   - ERC20Permit によりガスレス承認（署名だけでapproveできる）に対応
 */
contract ATSToken is ERC20, ERC20Burnable, ERC20Permit {

    // 総供給上限: 1,000,000 ATSC（小数18桁込みの実数値）
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10 ** 18;

    /**
     * @param initialHolder デプロイ時に全トークンを受け取るアドレス
     *                      （通常はデプロイしたウォレット = 配布元）
     */
    constructor(address initialHolder)
        ERC20("ATSCoin", "ATSC")
        ERC20Permit("ATSCoin")
    {
        // 全量をまとめてミント（これ以降は追加発行の手段がない）
        _mint(initialHolder, MAX_SUPPLY);
    }
}
