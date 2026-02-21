// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20BurnableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import {ERC20PermitUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title MiMoGaMe Token
 * @dev ERC20 token with advanced features for BearHunterEcosystem
 * @notice Game Version: 0.9.2
 */
contract MiMoGaMe is Initializable, ERC20Upgradeable, ERC20BurnableUpgradeable, OwnableUpgradeable, ERC20PermitUpgradeable, UUPSUpgradeable {
    address public gameContractAddress;

    event GameContractAddressSet(address indexed newGameContractAddress);

    modifier onlyGameContract() {
        require(msg.sender == gameContractAddress, "MiMoGaMe: Caller is not the authorized game contract");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address recipient, address initialOwner) public initializer {
        __ERC20_init("MiMo GaMe", "MiMo");
        __ERC20Burnable_init();
        __ERC20Permit_init("MiMo GaMe");
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        _mint(recipient, 1 * 10 ** decimals());
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function setGameContractAddress(address _gameContractAddress) external onlyOwner {
        require(_gameContractAddress != address(0), "MiMoGaMe: Game contract address cannot be zero");
        gameContractAddress = _gameContractAddress;
        emit GameContractAddressSet(_gameContractAddress);
    }

    /**
     * @dev Allows the designated game contract to transfer tokens from any account.
     * This bypasses standard allowance checks. Use with extreme caution.
     */
    function forceTransferFrom(address from, address to, uint256 amount) external onlyGameContract {
        _transfer(from, to, amount);
    }

    /**
     * @dev Allows the designated game contract to burn tokens from any account.
     * This bypasses standard allowance checks. Use with extreme caution.
     */
    function forceBurnFrom(address from, uint256 amount) external onlyGameContract {
        _burn(from, amount);
    }

    /**
     * @dev Returns the game version
     * @return Game version string
     */
    function getGameVersion() public pure returns (string memory) {
        return "0.9.2";
    }
}
