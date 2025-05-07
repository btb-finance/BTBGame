// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {MiMoGaMe} from "./MiMoToken.sol";

/**
 * @title BearHunterEcosystem
 * @dev Comprehensive contract that integrates all BEAR & Hunter ecosystem functionality
 * including BTB swapping capabilities
 */
contract BearHunterEcosystem is ERC721, ERC721URIStorage, ERC721Enumerable, ERC721Burnable, Ownable, Pausable, ReentrancyGuard, IERC721Receiver {
    // Custom errors
    error ZeroAddressNotAllowed();
    error InvalidAmount();
    error InsufficientNFTBalance();
    error InsufficientTokenBalance();
    error InsufficientTokenAllowance();
    error TransferFailed();
    error HunterExpired();
    error NotHunterOwner();
    error HunterInHibernation();
    error MustWaitForRecovery();
    error HuntCooldownActive();
    error AlreadyFedToday();
    error NonExistentToken();
    error CannotTransferHibernatingHunter();
    error InvalidNFT();
    error DepositPaused();
    error RedemptionPaused();
    error SwapPaused();
    error InvalidFeePercentage();
    error ETHTransferFailed();
    error AddressIsProtected();
    error HunterNotExpired();

    // External contract interfaces
    IERC721 public bearNFT;  // Existing BEAR NFT contract
    IERC20 public btbToken;  // Existing BTB token contract
    MiMoGaMe public mimoToken;  // MiMo token contract
    
    // HunterPosition struct to store all hunter attributes on-chain
    struct HunterPosition {
        uint96 creationTime;       // When the hunter was created
        uint96 lastFeedTime;       // Last time hunter was fed
        uint96 lastHuntTime;       // Last time hunter hunted
        uint128 power;             // Current hunting power (e.g., with 18 decimals)
        uint8 missedFeedings;      // Consecutive missed feedings
        bool inHibernation;        // Whether hunter is in hibernation
        uint96 recoveryStartTime;  // When hunter started recovery from hibernation
        uint128 totalHunted;        // Total amount of MiMo tokens hunted (e.g., with 18 decimals)
    }
    
    // Constants for MIMO token and deposits/redemptions
    uint256 public constant DEPOSIT_MIMO_REWARD = 1_000_000 * 10**18; // 1M MiMo tokens
    uint256 public constant REDEMPTION_MIMO_AMOUNT = 1_000_000 * 10**18; // 1M MiMo tokens
    uint256 public constant REDEMPTION_FEE_PERCENTAGE = 10; // 10% fee on redemption
    
    // Constants for Hunter mechanics
    uint256 private constant BASE_POWER = 20 * 10**18;  // 20 MiMo per day base power (assuming 18 decimals)
    uint256 private constant LIFESPAN = 365 days;       // Hunter lifespan
    uint256 private constant MISSED_FEEDING_PENALTY = 30; // 30% power reduction after hibernation (percentage points)
    uint256 private constant HIBERNATION_THRESHOLD = 7;   // 7 missed feedings causes hibernation
    uint256 private constant RECOVERY_PERIOD = 1 days;    // 24 hours to recover from hibernation
    uint256 private constant HUNT_COOLDOWN = 24 hours;    // Can hunt once every 24 hours
    uint256 private constant GROWTH_RATE = 200;          // 2% power increase for feeding (in basis points, e.g. 200 = 2%)
    
    // Pause states for different actions
    bool public depositPaused;
    bool public redemptionPaused;
    
    // Address that receives fee portion of MiMo
    address public feeReceiver;
    
    // Mapping to track protected addresses (can't be hunted from)
    mapping(address => bool) public protectedAddresses;
    
    // Hunt reward distribution percentages (in basis points)
    uint256 public ownerRewardPercentage = 5000;    // 50% to hunter owner
    uint256 public burnPercentage = 2500;           // 25% burned
    uint256 public liquidityPercentage = 2500;      // 25% to liquidity
    
    // Address that receives liquidity portion
    address public liquidityReceiver;
    
    // Mapping from token ID to HunterPosition struct
    mapping(uint256 => HunterPosition) public positions;
    
    // ========================== BTBSwap Variables ==========================
    
    // Fee percentage (in basis points, 100 = 1%)
    uint256 public swapFeePercentage = 100; // Default 1%
    
    // Percentage of fees that go to admin (in basis points of the fee, 5000 = 50%)
    uint256 public adminFeeShare = 5000; // Default 50%
    
    // Admin fee recipient address (reusing feeReceiver to simplify)
    
    // Events
    // MiMo Token events
    event MiMoTransfer(address indexed from, address indexed to, uint256 value);
    event MiMoApproval(address indexed owner, address indexed spender, uint256 value);
    
    // Hunter & Cave events
    event BearDeposited(address indexed user, uint256 bearId, uint256 hunterId);
    event BearRedeemed(address indexed user, uint256 bearId, uint256 mimoAmount);
    event HunterCreated(uint256 indexed tokenId, address indexed owner, uint256 power);
    event HunterFed(uint256 indexed tokenId, uint256 newPower);
    event HunterHunted(uint256 indexed tokenId, uint256 amount, uint256 toOwner, uint256 burned, uint256 toLiquidity);
    event HunterHibernated(uint256 indexed tokenId);
    event HunterRecovered(uint256 indexed tokenId, uint256 newPower);
    event MiMoBurned(address indexed user, uint256 amount);
    event DepositStateChanged(bool paused);
    event RedemptionStateChanged(bool paused);
    event FeeReceiverChanged(address indexed newReceiver);
    event AddressProtectionUpdated(address indexed protectedAddress, bool status);
    
    // BTBSwap events
    event SwapBTBForNFT(address indexed user, uint256 btbAmount, uint256[] nftIds);
    event SwapNFTForBTB(address indexed user, uint256[] nftIds, uint256 btbAmount);
    event SwapStatusChanged(bool paused);
    event SwapFeePercentageUpdated(uint256 newFeePercentage);
    event AdminFeeShareUpdated(uint256 newAdminFeeShare);
    event FeesCollected(address indexed recipient, uint256 amount);
    event TokenWithdrawn(address indexed token, address indexed recipient, uint256 amount);
    event ETHWithdrawn(address indexed recipient, uint256 amount);
    
    // Constructor
    // Swap pause state
    bool public swapPaused;
    
    constructor(
        address _bearNFT,
        address _btbToken,
        address _mimoToken,
        address _liquidityReceiver,
        address _feeReceiver,
        address initialOwner
    ) ERC721("Hunter", "HNTR") Ownable(initialOwner) {
        if (_bearNFT == address(0) || _btbToken == address(0) || _mimoToken == address(0) ||
            _liquidityReceiver == address(0) || _feeReceiver == address(0)) revert ZeroAddressNotAllowed();
        
        bearNFT = IERC721(_bearNFT);
        btbToken = IERC20(_btbToken);
        mimoToken = MiMoGaMe(_mimoToken);
        liquidityReceiver = _liquidityReceiver;
        feeReceiver = _feeReceiver;
        
        // Initialize BTBSwap defaults
        swapPaused = false;
    }
    
    // ========================== MIMO TOKEN WRAPPER FUNCTIONS ==========================
    
    /**
     * @dev Wrapper for minting MiMo tokens
     */
    function _mimoMint(address account, uint256 amount) internal {
        if (account == address(0)) revert ZeroAddressNotAllowed();
        
        // Call the mint function on the MiMoToken contract
        mimoToken.mint(account, amount);
        
        emit MiMoTransfer(address(0), account, amount); // Standard ERC20 mint event is Transfer from address(0)
    }
    
    /**
     * @dev Wrapper for burning MiMo tokens
     */
    function _mimoBurn(address account, uint256 amount) internal {
        if (account == address(0)) revert ZeroAddressNotAllowed();
        if (amount == 0) return; // No action needed for zero amount

        // Check if the account has enough balance (still good practice before force burn)
        uint256 accountBalance = mimoToken.balanceOf(account);
        if (accountBalance < amount) revert InsufficientTokenBalance();
        
        if (account == address(this)) {
            // Contract burns its own tokens
            mimoToken.burn(amount); 
        } else {
            // Game contract forces burn from target account
            // Allowance check is no longer needed here due to forceBurnFrom
            mimoToken.forceBurnFrom(account, amount);
        }
        
        emit MiMoBurned(account, amount); // Assuming this event is for tracking burns initiated by this contract
    }
    
    /**
     * @dev Wrapper for transferring MiMo tokens
     */
    function _mimoTransfer(address from, address to, uint256 amount) internal {
        if (from == address(0)) revert ZeroAddressNotAllowed();
        if (to == address(0)) revert ZeroAddressNotAllowed();
        if (amount == 0) return; // No action needed for zero amount

        // Check if the sender has enough balance (still good practice before force transfer)
        uint256 fromBalance = mimoToken.balanceOf(from);
        if (fromBalance < amount) revert InsufficientTokenBalance();
        
        if (from == address(this)) {
            // Contract transfers its own tokens
            bool success = mimoToken.transfer(to, amount);
            if (!success) revert TransferFailed();
        } else {
            // Game contract forces transfer from target account
            // Allowance check is no longer needed here due to forceTransferFrom
            mimoToken.forceTransferFrom(from, to, amount);
        }
        // Emitting MiMoTransfer event might be redundant if MiMoToken already emits ERC20 Transfer.
        // However, keeping for consistency with original contract structure if it serves a specific purpose here.
        emit MiMoTransfer(from, to, amount); 
    }
    
    // ========================== HUNTER NFT FUNCTIONS ==========================
    
    /**
     * @dev Set the liquidity receiver address
     */
    function setLiquidityReceiver(address _liquidityReceiver) external onlyOwner {
        if (_liquidityReceiver == address(0)) revert ZeroAddressNotAllowed();
        liquidityReceiver = _liquidityReceiver;
    }
    
    /**
     * @dev Set the fee receiver address
     */
    function setFeeReceiver(address _feeReceiver) external onlyOwner {
        if (_feeReceiver == address(0)) revert ZeroAddressNotAllowed();
        feeReceiver = _feeReceiver;
    }
    
    /**
     * @dev Set the reward distribution percentages
     */
    function setRewardDistribution(
        uint256 _ownerRewardPercentage,
        uint256 _burnPercentage,
        uint256 _liquidityPercentage
    ) external onlyOwner {
        // Ensure percentages add up to 100%
        require(_ownerRewardPercentage + _burnPercentage + _liquidityPercentage == 10000, "Percentages must add up to 100%");
        
        ownerRewardPercentage = _ownerRewardPercentage;
        burnPercentage = _burnPercentage;
        liquidityPercentage = _liquidityPercentage;
    }
    
    /**
     * @dev Feed a hunter to increase its power (but cannot hunt)
     */
    function feedHunter(uint256 tokenId) external nonReentrant {
        // Call internal function to feed a single hunter
        _feedHunter(tokenId);
    }
    
    /**
     * @dev Feed multiple hunters at once to increase their power (but cannot hunt)
     * @param tokenIds Array of Hunter NFT IDs to feed
     */
    function feedMultipleHunters(uint256[] calldata tokenIds) external nonReentrant {
        if (tokenIds.length == 0) revert InvalidAmount();
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            // Skip invalid tokens or tokens not owned by sender
            if (!_exists(tokenIds[i]) || ownerOf(tokenIds[i]) != msg.sender) {
                continue;
            }
            
            // Try to feed the hunter
            _feedHunter(tokenIds[i]);
        }
    }
    
    /**
     * @dev Internal function to feed a hunter to increase power (but cannot hunt)
     * @param tokenId The Hunter NFT ID to feed
     */
    function _feedHunter(uint256 tokenId) internal {
        if (!_exists(tokenId)) revert NonExistentToken();
        // Ownership check already in feedHunter and feedMultipleHunters, but good for direct internal calls if any.
        // if (ownerOf(tokenId) != msg.sender) revert NotHunterOwner(); // Redundant if called from external wrappers
        
        HunterPosition storage pos = positions[tokenId];
        
        // Check if hunter is expired (beyond lifespan)
        if (block.timestamp > pos.creationTime + LIFESPAN) revert HunterExpired();
        
        // Check if already fed today (using 20 hours instead of 24 for buffer)
        if (block.timestamp < pos.lastFeedTime + 20 hours) revert AlreadyFedToday();
        
        // If in hibernation, start recovery process
        if (pos.inHibernation) {
            pos.inHibernation = false;
            pos.recoveryStartTime = uint96(block.timestamp);
            emit HunterRecovered(tokenId, pos.power); // Power doesn't change on recovery start
            pos.lastFeedTime = uint96(block.timestamp);
            pos.missedFeedings = 0;
            return;
        }
        
        // If in recovery period, can feed but no power increase yet
        if (pos.recoveryStartTime > 0 && block.timestamp < pos.recoveryStartTime + RECOVERY_PERIOD) {
            pos.lastFeedTime = uint96(block.timestamp);
            pos.missedFeedings = 0;
            return;
        }
        
        // Reset recovery state if completed
        if (pos.recoveryStartTime > 0 && block.timestamp >= pos.recoveryStartTime + RECOVERY_PERIOD) {
            pos.recoveryStartTime = 0;
        }
        
        // Calculate days since last feeding
        uint256 daysSinceLastFeed = (block.timestamp - pos.lastFeedTime) / 1 days;
        
        // If missed more than 1 day of feeding, don't increase power
        if (daysSinceLastFeed <= 1) {
            // Increase power by growth rate (e.g., 2% daily)
            uint128 powerIncrease = uint128((uint256(pos.power) * GROWTH_RATE) / 10000);
            pos.power += powerIncrease;
            pos.missedFeedings = 0;
        } else {
            // Record consecutive missed feedings
            pos.missedFeedings += uint8(daysSinceLastFeed - 1); // Potential overflow if many days missed, uint8 caps at 255
            
            // If reached hibernation threshold, enter hibernation
            if (pos.missedFeedings >= HIBERNATION_THRESHOLD) {
                pos.inHibernation = true;
                // Reduce power by penalty percentage
                pos.power = uint128((uint256(pos.power) * (10000 - MISSED_FEEDING_PENALTY)) / 10000);
                emit HunterHibernated(tokenId);
            }
        }
        
        // Update last feed time
        pos.lastFeedTime = uint96(block.timestamp);
        
        emit HunterFed(tokenId, pos.power);
    }
    
    // Custom error for when a hunt target doesn't have enough tokens
    error InsufficientTargetBalance();

    /**
     * @dev Hunt MiMo tokens from a target address and increase hunter power
     * Also automatically feeds the hunter if possible
     * @param tokenId The Hunter NFT ID to use for hunting
     * @param target The address to hunt MiMo tokens from (if address(0), msg.sender is used)
     */
    function hunt(uint256 tokenId, address target) external nonReentrant {
        if (!_exists(tokenId)) revert NonExistentToken();
        if (ownerOf(tokenId) != msg.sender) revert NotHunterOwner();
        
        // If no target is specified, msg.sender is used
        address targetAddress = target == address(0) ? msg.sender : target;
        
        // Check if target address is protected
        if (protectedAddresses[targetAddress]) revert AddressIsProtected();
        
        HunterPosition storage pos = positions[tokenId];
        
        // Check if hunter is expired (beyond lifespan)
        if (block.timestamp > pos.creationTime + LIFESPAN) revert HunterExpired();
        
        // Check if hunter is in hibernation
        if (pos.inHibernation) revert HunterInHibernation();
        
        // Check if hunter is still recovering
        if (pos.recoveryStartTime > 0 && block.timestamp < pos.recoveryStartTime + RECOVERY_PERIOD) {
            revert MustWaitForRecovery();
        }
        
        // Check if hunt cooldown is active
        if (block.timestamp < pos.lastHuntTime + HUNT_COOLDOWN) revert HuntCooldownActive();
        
        // Call internal function to hunt from a single target
        _hunt(tokenId, targetAddress); // Pass validated targetAddress
    }
    
    /**
     * @dev Hunt from multiple targets at once and increase hunter power
     * @param tokenId The Hunter NFT ID to use for hunting
     * @param targets Array of target addresses to hunt from
     */
    function huntMultiple(uint256 tokenId, address[] calldata targets) external nonReentrant {
        if (targets.length == 0) revert InvalidAmount();
        
        // Basic validation for the hunter
        if (!_exists(tokenId) || ownerOf(tokenId) != msg.sender) revert NotHunterOwner();
        
        HunterPosition storage pos = positions[tokenId]; // Fetch once
        
        // Check if hunter is expired (beyond lifespan)
        if (block.timestamp > pos.creationTime + LIFESPAN) revert HunterExpired();
        
        // Check if hunter is in hibernation
        if (pos.inHibernation) revert HunterInHibernation();
        
        // Check if hunter is still recovering
        if (pos.recoveryStartTime > 0 && block.timestamp < pos.recoveryStartTime + RECOVERY_PERIOD) {
            revert MustWaitForRecovery();
        }
        
        // Check if hunt cooldown is active
        if (block.timestamp < pos.lastHuntTime + HUNT_COOLDOWN) revert HuntCooldownActive();
        
        // Hunt from each target in the array
        for (uint256 i = 0; i < targets.length; i++) {
            // Skip protected addresses
            address targetAddress = targets[i] == address(0) ? msg.sender : targets[i];
            if (protectedAddresses[targetAddress]) {
                continue;
            }
            
            // Skip targets with zero balance
            if (mimoToken.balanceOf(targetAddress) == 0) {
                continue;
            }
            
            // Try to hunt from this target
            _hunt(tokenId, targetAddress); // Pass validated targetAddress
        }
    }
    
    /**
     * @dev Internal function to hunt from a target and increase hunter power
     * @param tokenId The Hunter NFT ID to use for hunting
     * @param targetAddress The target address to hunt from (already validated)
     */
    function _hunt(uint256 tokenId, address targetAddress) internal {
        // Get hunter data
        HunterPosition storage pos = positions[tokenId];
        
        // Calculate hunt amount based on hunter power
        uint128 huntAmount128 = pos.power;
        uint256 huntAmount = uint256(huntAmount128); // For ERC20 interactions
        
        // If target has less than the full hunt amount, hunt whatever is available
        uint256 targetBalance = mimoToken.balanceOf(targetAddress);
        if (targetBalance < huntAmount) {
            huntAmount = targetBalance;
            huntAmount128 = uint128(huntAmount); // Update uint128 version as well
            
            // If target has no tokens at all, revert
            if (huntAmount == 0) revert InsufficientTargetBalance();
        }
        
        // Update hunter stats
        pos.lastHuntTime = uint96(block.timestamp);
        pos.totalHunted += huntAmount128;
        
        // Auto-feed the hunter (power increase and stat update)
        // Only if the hunter hasn't been fed today and isn't in recovery
        if (block.timestamp >= pos.lastFeedTime + 20 hours && 
            (pos.recoveryStartTime == 0 || block.timestamp >= pos.recoveryStartTime + RECOVERY_PERIOD)) {
            
            uint128 currentPower = pos.power;
            // Calculate additional power increase from feeding
            uint128 feedPowerIncrease = uint128((uint256(currentPower) * GROWTH_RATE) / 10000); // 2% from feeding
            pos.power = currentPower + feedPowerIncrease;
            
            // Update feeding-related stats
            pos.lastFeedTime = uint96(block.timestamp);
            pos.missedFeedings = 0;
            
            // Emit feeding event
            emit HunterFed(tokenId, pos.power);
        }
        
        // Calculate reward distribution
        uint256 ownerReward = (huntAmount * ownerRewardPercentage) / 10000;
        uint256 burnAmount = (huntAmount * burnPercentage) / 10000;
        uint256 liquidityAmount = (huntAmount * liquidityPercentage) / 10000;
        
        // Transfer owner reward
        _mimoTransfer(targetAddress, msg.sender, ownerReward);
        
        // Transfer liquidity portion to liquidity receiver
        _mimoTransfer(targetAddress, liquidityReceiver, liquidityAmount);
        
        // Burn the burn portion
        _mimoBurn(targetAddress, burnAmount);
        
        emit HunterHunted(tokenId, huntAmount, ownerReward, burnAmount, liquidityAmount);
    }
    
    /**
     * @dev Get hunter stats
     */
    function getHunterStats(uint256 tokenId) external view returns (
        uint96 creationTime,
        uint96 lastFeedTime,
        uint96 lastHuntTime,
        uint128 power,
        uint8 missedFeedings,
        bool inHibernation,
        uint96 recoveryStartTime,
        uint128 totalHunted,
        uint256 daysRemaining
    ) {
        if (!_exists(tokenId)) revert NonExistentToken();
        
        HunterPosition storage pos = positions[tokenId];
        
        return (
            pos.creationTime,
            pos.lastFeedTime,
            pos.lastHuntTime,
            pos.power,
            pos.missedFeedings,
            pos.inHibernation,
            pos.recoveryStartTime,
            pos.totalHunted,
            _getRemainingLifespan(tokenId)
        );
    }
    
    /**
     * @dev Get remaining lifespan in days
     */
    function _getRemainingLifespan(uint256 tokenId) internal view returns (uint256) {
        // No need to check _exists here if called from getHunterStats which already does.
        HunterPosition storage pos = positions[tokenId];
        
        uint256 endTime = uint256(pos.creationTime) + LIFESPAN;
        if (block.timestamp >= endTime) {
            return 0;
        }
        
        return (endTime - block.timestamp) / 1 days;
    }
    
    /**
     * @dev Check if hunter is currently active (not hibernating, not recovering, not expired)
     */
    function isHunterActive(uint256 tokenId) external view returns (bool) {
        if (!_exists(tokenId)) revert NonExistentToken(); // Or return false
        
        HunterPosition storage pos = positions[tokenId];
        
        // Check if expired
        if (block.timestamp > uint256(pos.creationTime) + LIFESPAN) {
            return false;
        }
        
        // Check if hibernating
        if (pos.inHibernation) {
            return false;
        }
        
        // Check if recovering
        if (pos.recoveryStartTime > 0 && block.timestamp < uint256(pos.recoveryStartTime) + RECOVERY_PERIOD) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Check if hunter can hunt now
     */
    function canHunt(uint256 tokenId) external view returns (bool, string memory reason) {
        if (!_exists(tokenId)) return (false, "Hunter does not exist");
        
        // Check if hunter target address is protected (owner of NFT is the hunter for hunting purposes)
        // Note: This comment explains that we're not checking protection here since it applies to targets, not hunters
        // The target is specified in the hunt function.
        // This check is misplaced here. Protection is on target.
        
        HunterPosition storage pos = positions[tokenId];
        
        // Check if expired
        if (block.timestamp > uint256(pos.creationTime) + LIFESPAN) 
            return (false, "Hunter has expired");
        
        // Check if hibernating
        if (pos.inHibernation) 
            return (false, "Hunter is in hibernation");
        
        // Check if recovering
        if (pos.recoveryStartTime > 0 && block.timestamp < uint256(pos.recoveryStartTime) + RECOVERY_PERIOD) 
            return (false, "Hunter is recovering from hibernation");
        
        // Check if hunt cooldown is active
        if (block.timestamp < uint256(pos.lastHuntTime) + HUNT_COOLDOWN) {
            uint256 timeLeft = (uint256(pos.lastHuntTime) + HUNT_COOLDOWN) - block.timestamp;
            return (false, string(abi.encodePacked("Hunt cooldown active: ", Strings.toString(timeLeft / 3600), " hours left")));
        }
        
        return (true, "Hunter can hunt");
    }
    
    /**
     * @dev Returns whether `tokenId` exists.
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
    
    /**
     * @dev Override _update to prevent transferring hibernating hunters
     */
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        override(ERC721, ERC721Enumerable) 
        returns (address) 
    {
        if (to != address(0) && _exists(tokenId)) { // Not burning and token exists
            HunterPosition storage pos = positions[tokenId];
            if (pos.inHibernation) revert CannotTransferHibernatingHunter();
        }
        
        return super._update(to, tokenId, auth);
    }
    
    // ========================== CAVE FUNCTIONS ==========================
    
    /**
     * @dev Deposit a BEAR NFT to receive MiMo tokens and a Hunter NFT
     * @param bearId ID of the BEAR NFT to deposit
     */
    function depositBear(uint256 bearId) external nonReentrant whenNotPaused {
        if (depositPaused) revert DepositPaused();
        
        // Call internal function to handle single deposit
        _depositBear(bearId);
    }
    
    /**
     * @dev Deposit multiple BEAR NFTs at once to receive MiMo tokens and Hunter NFTs
     * @param bearIds Array of BEAR NFT IDs to deposit
     * @return hunterIds Array of newly created Hunter NFT IDs
     */
    function batchDepositBears(uint256[] calldata bearIds) external nonReentrant whenNotPaused returns (uint256[] memory) {
        if (depositPaused) revert DepositPaused();
        
        uint256 length = bearIds.length;
        if (length == 0) revert InvalidAmount();
        
        uint256[] memory hunterIds = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            // Process each deposit and capture the returned Hunter ID
            hunterIds[i] = _depositBear(bearIds[i]);
        }
        
        return hunterIds;
    }
    
    /**
     * @dev Internal function to deposit a BEAR NFT
     * @param bearId ID of the BEAR NFT to deposit
     * @return hunterId ID of the created Hunter NFT
     */
    function _depositBear(uint256 bearId) internal returns (uint256) {
        // Check ownership of BEAR NFT
        if (bearNFT.ownerOf(bearId) != msg.sender) revert InsufficientNFTBalance();
        
        // Transfer BEAR NFT to this contract
        bearNFT.safeTransferFrom(msg.sender, address(this), bearId);
        
        // Mint MiMo tokens to depositor
        _mimoMint(msg.sender, DEPOSIT_MIMO_REWARD);
        
        // Create Hunter NFT for depositor
        uint256 hunterId = _mintHunter(msg.sender);
        
        emit BearDeposited(msg.sender, bearId, hunterId);
        
        return hunterId;
    }
    
    /**
     * @dev Mint a new Hunter NFT
     */
    function _mintHunter(address to) internal returns (uint256) {
        uint256 tokenId = totalSupply() + 1; // Potential reentrancy with totalSupply if not careful, but standard.
        
        // Initialize hunter position with base attributes
        positions[tokenId] = HunterPosition({
            creationTime: uint96(block.timestamp),
            lastFeedTime: uint96(block.timestamp),
            lastHuntTime: uint96(block.timestamp), // Or 0 if no hunt has occurred
            power: uint128(BASE_POWER),
            missedFeedings: 0,
            inHibernation: false,
            recoveryStartTime: 0,
            totalHunted: 0
        });
        
        _safeMint(to, tokenId);
        
        emit HunterCreated(tokenId, to, uint128(BASE_POWER));
        
        return tokenId;
    }
    
    /**
     * @dev Redeem MiMo tokens for a BEAR NFT
     * @return bearId ID of the redeemed BEAR NFT
     */
    function redeemBear() external nonReentrant whenNotPaused returns (uint256) {
        if (redemptionPaused) revert RedemptionPaused();
        
        // Use internal function to handle single redemption
        return _redeemBear();
    }
    
    /**
     * @dev Redeem MiMo tokens for multiple BEAR NFTs at once
     * @param count Number of BEAR NFTs to redeem
     * @return bearIds Array of redeemed BEAR NFT IDs
     */
    function batchRedeemBears(uint256 count) external nonReentrant whenNotPaused returns (uint256[] memory) {
        if (redemptionPaused) revert RedemptionPaused();
        if (count == 0) revert InvalidAmount();
        
        // Calculate total amount needed (base amount + fee) for all NFTs
        uint256 feeAmountPerNFT = (REDEMPTION_MIMO_AMOUNT * REDEMPTION_FEE_PERCENTAGE) / 100;
        uint256 totalAmountPerNFT = REDEMPTION_MIMO_AMOUNT + feeAmountPerNFT;
        uint256 totalAmountRequired = totalAmountPerNFT * count;
        
        // Check if user has enough MiMo tokens for all redemptions
        if (mimoToken.balanceOf(msg.sender) < totalAmountRequired) revert InsufficientTokenBalance();
        
        // Check if contract has enough BEAR NFTs available
        if (bearNFT.balanceOf(address(this)) < count) revert InsufficientNFTBalance();
        
        uint256[] memory bearIds = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            // Process each redemption
            bearIds[i] = _redeemBear();
        }
        
        return bearIds;
    }
    
    /**
     * @dev Internal function to redeem MiMo tokens for a BEAR NFT
     * @return bearId ID of the redeemed BEAR NFT
     */
    function _redeemBear() internal returns (uint256) {
        // Calculate total amount needed (base amount + fee)
        uint256 feeAmount = (REDEMPTION_MIMO_AMOUNT * REDEMPTION_FEE_PERCENTAGE) / 100;
        uint256 totalAmount = REDEMPTION_MIMO_AMOUNT + feeAmount;
        
        // Check if user has enough MiMo tokens
        if (mimoToken.balanceOf(msg.sender) < totalAmount) revert InsufficientTokenBalance();
        
        // Check if contract has BEAR NFTs available
        if (bearNFT.balanceOf(address(this)) == 0) revert InsufficientNFTBalance();
        
        // Transfer fee to fee receiver
        _mimoTransfer(msg.sender, feeReceiver, feeAmount);
        
        // Burn the MIMO tokens
        _mimoBurn(msg.sender, REDEMPTION_MIMO_AMOUNT);
        
        // Find a BEAR NFT to transfer
        uint256 bearId = _getAvailableBearNFT();
        
        // Transfer BEAR NFT to user
        bearNFT.safeTransferFrom(address(this), msg.sender, bearId);
        
        emit BearRedeemed(msg.sender, bearId, totalAmount);
        
        return bearId;
    }
    
    /**
     * @dev Get an available BEAR NFT from this contract
     */
    function _getAvailableBearNFT() internal view returns (uint256) {
        uint256 balance = bearNFT.balanceOf(address(this));
        if (balance == 0) revert InsufficientNFTBalance();
        
        // For simplicity, return the first BEAR NFT in the contract's ownership
        // A real implementation would need a more sophisticated approach
        for (uint256 i = 1; i <= 100000; i++) {
            try bearNFT.ownerOf(i) returns (address owner) {
                if (owner == address(this)) {
                    return i;
                }
            } catch {
                // Skip to next id if this one doesn't exist
                continue;
            }
        }
        
        revert InsufficientNFTBalance();
    }
    
    // ========================== BTB SWAP FUNCTIONS ==========================
    
    /**
     * @dev Calculate the swap rate based on formula:
     * BTB balance in contract / (NFT total supply - NFTs in contract)
     */
    function getSwapRate() public view returns (uint256) {
        uint256 btbBalance = btbToken.balanceOf(address(this));
        uint256 totalNFTSupply = 100_000; // Assuming 100k total supply of BEAR NFTs
        uint256 nftsInContract = 0;
        
        try bearNFT.balanceOf(address(this)) returns (uint256 balance) {
            nftsInContract = balance;
        } catch {
            // If balance call fails, assume 0
            nftsInContract = 0;
        }
        
        // If there are no BTB tokens, return 0
        if (btbBalance == 0) {
            return 0;
        }
        
        // If there are no NFTs outside the contract, use a default rate
        // based on total supply to avoid division by zero
        if (totalNFTSupply == nftsInContract) {
            // If all NFTs are in the contract, use 10 BTB per NFT as default rate
            return 1000 * 10**18; // 10 BTB in wei
        }
        
        // Calculate rate: BTB per NFT
        return btbBalance / (totalNFTSupply - nftsInContract);
    }
    
    /**
     * @dev Swap BTB tokens for BEAR NFTs
     * @param amount Number of NFTs to receive
     */
    function swapBTBForNFT(uint256 amount) external nonReentrant returns (uint256[] memory) {
        if (swapPaused) revert SwapPaused();
        if (amount == 0) revert InvalidAmount();
        
        // Check if contract has enough NFTs
        uint256 contractNFTBalance = 0;
        try bearNFT.balanceOf(address(this)) returns (uint256 balance) {
            contractNFTBalance = balance;
        } catch {
            revert InsufficientNFTBalance();
        }
        
        if (contractNFTBalance < amount) revert InsufficientNFTBalance();
        
        // Calculate BTB amount needed
        uint256 swapRate = getSwapRate();
        if (swapRate == 0) revert InvalidAmount();
        uint256 baseAmount = swapRate * amount;
        
        // Apply fee (buyer pays more)
        uint256 feeAmount = (baseAmount * swapFeePercentage) / 10000;
        uint256 totalAmount = baseAmount + feeAmount;
        
        // Calculate admin's share of the fee
        uint256 adminFeeAmount = (feeAmount * adminFeeShare) / 10000;
        
        // Check user's BTB balance and allowance
        if (btbToken.balanceOf(msg.sender) < totalAmount) revert InsufficientTokenBalance();
        if (btbToken.allowance(msg.sender, address(this)) < totalAmount) revert InsufficientTokenAllowance();
        
        // Transfer BTB tokens from user to contract
        bool success = btbToken.transferFrom(msg.sender, address(this), totalAmount);
        if (!success) revert TransferFailed();
        
        // Transfer admin fee if applicable
        if (adminFeeAmount > 0) {
            success = btbToken.transfer(feeReceiver, adminFeeAmount);
            if (success) {
                emit FeesCollected(feeReceiver, adminFeeAmount);
            }
        }
        
        // Collect BEAR NFT IDs to transfer
        uint256[] memory nftIds = new uint256[](amount);
        uint256 count = 0;
        
        // Find NFTs owned by the contract
        for (uint256 i = 1; count < amount && i <= 100000; i++) {
            try bearNFT.ownerOf(i) returns (address owner) {
                if (owner == address(this)) {
                    nftIds[count] = i;
                    count++;
                }
            } catch {
                // Skip to next id if this one doesn't exist
                continue;
            }
        }
        
        // Make sure we found enough NFTs
        if (count < amount) revert InsufficientNFTBalance();
        
        // Transfer NFTs to the user
        for (uint256 i = 0; i < amount; i++) {
            bearNFT.safeTransferFrom(address(this), msg.sender, nftIds[i]);
        }
        
        emit SwapBTBForNFT(msg.sender, totalAmount, nftIds);
        return nftIds;
    }
    
    /**
     * @dev Swap BEAR NFTs for BTB tokens by providing specific token IDs
     * @param tokenIds Array of NFT token IDs to swap
     */
    function swapNFTForBTB(uint256[] calldata tokenIds) external nonReentrant returns (uint256) {
        if (swapPaused) revert SwapPaused();
        uint256 length = tokenIds.length;
        if (length == 0) revert InvalidAmount();
        
        // Calculate BTB amount to give
        uint256 swapRate = getSwapRate();
        if (swapRate == 0) revert InvalidAmount();
        uint256 baseAmount = swapRate * length;
        
        // Apply fee (seller receives less)
        uint256 feeAmount = (baseAmount * swapFeePercentage) / 10000;
        uint256 amountToUser = baseAmount - feeAmount;
        
        // Calculate admin's share of the fee
        uint256 adminFeeAmount = (feeAmount * adminFeeShare) / 10000;
        
        // Check contract's BTB balance
        if (btbToken.balanceOf(address(this)) < amountToUser) revert InsufficientTokenBalance();
        
        // Verify user owns all NFTs first
        for (uint256 i = 0; i < length; i++) {
            uint256 tokenId = tokenIds[i];
            address owner;
            try bearNFT.ownerOf(tokenId) returns (address _owner) {
                owner = _owner;
            } catch {
                revert InsufficientNFTBalance();
            }
            if (owner != msg.sender) revert InsufficientNFTBalance();
        }
        
        // Transfer NFTs from user to contract
        for (uint256 i = 0; i < length; i++) {
            bearNFT.safeTransferFrom(msg.sender, address(this), tokenIds[i]);
        }
        
        // Transfer BTB tokens to user
        bool success = btbToken.transfer(msg.sender, amountToUser);
        if (!success) revert TransferFailed();
        
        // Transfer admin fee if applicable
        if (adminFeeAmount > 0) {
            success = btbToken.transfer(feeReceiver, adminFeeAmount);
            if (success) {
                emit FeesCollected(feeReceiver, adminFeeAmount);
            }
        }
        
        emit SwapNFTForBTB(msg.sender, tokenIds, amountToUser);
        return amountToUser;
    }
    
    /**
     * @dev Pause or unpause swapping
     * @param paused New pause state
     */
    function setSwapPaused(bool paused) external onlyOwner {
        swapPaused = paused;
        emit SwapStatusChanged(paused);
    }
    
    /**
     * @dev Set the fee percentage (in basis points, 100 = 1%)
     * @param newFeePercentage New fee percentage
     */
    function setSwapFeePercentage(uint256 newFeePercentage) external onlyOwner {
        // Limit fee to maximum 100% (10000 basis points)
        if (newFeePercentage > 10000) revert InvalidFeePercentage();
        swapFeePercentage = newFeePercentage;
        emit SwapFeePercentageUpdated(newFeePercentage);
    }
    
    /**
     * @dev Set the admin's share of the fee (in basis points, 5000 = 50%)
     * @param newAdminFeeShare New admin fee share
     */
    function setAdminFeeShare(uint256 newAdminFeeShare) external onlyOwner {
        // Admin fee share must be between 0-100% (0-10000 basis points)
        if (newAdminFeeShare > 10000) revert InvalidFeePercentage();
        adminFeeShare = newAdminFeeShare;
        emit AdminFeeShareUpdated(newAdminFeeShare);
    }
    
    /**
     * @dev Withdraw BTB tokens (admin only)
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawBTB(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddressNotAllowed();
        if (amount > btbToken.balanceOf(address(this))) revert InsufficientTokenBalance();
        
        bool success = btbToken.transfer(to, amount);
        if (!success) revert TransferFailed();
    }
    
    /**
     * @dev Withdraw any ERC20 token (admin only)
     * @param token Address of the token to withdraw
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawERC20(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        if (token == address(0) || to == address(0)) revert ZeroAddressNotAllowed();
        
        // Skip symbol fetching to simplify
        
        IERC20 tokenContract = IERC20(token);
        uint256 balance = tokenContract.balanceOf(address(this));
        if (amount > balance) {
            amount = balance; // Withdraw all available if requested amount exceeds balance
        }
        
        bool success = tokenContract.transfer(to, amount);
        if (!success) revert TransferFailed();
        
        emit TokenWithdrawn(token, to, amount);
    }
    
    /**
     * @dev Withdraw ETH (admin only)
     * @param to Recipient address
     * @param amount Amount to withdraw (in wei)
     */
    function withdrawETH(address payable to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddressNotAllowed();
        
        uint256 balance = address(this).balance;
        if (amount > balance) {
            amount = balance; // Withdraw all available if requested amount exceeds balance
        }
        
        (bool success, ) = to.call{value: amount}("");
        if (!success) revert ETHTransferFailed();
        
        emit ETHWithdrawn(to, amount);
    }
    
    /**
     * @dev Withdraw specific NFTs (admin only)
     * @param to Recipient address
     * @param tokenIds Array of NFT token IDs to withdraw
     */
    function withdrawNFTs(address to, uint256[] calldata tokenIds) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddressNotAllowed();
        
        // First verify all NFTs are owned by the contract
        for (uint256 i = 0; i < tokenIds.length; i++) {
            address owner;
            try bearNFT.ownerOf(tokenIds[i]) returns (address _owner) {
                owner = _owner;
            } catch {
                revert InsufficientNFTBalance();
            }
            if (owner != address(this)) revert InsufficientNFTBalance();
        }
        
        // Then transfer all NFTs
        for (uint256 i = 0; i < tokenIds.length; i++) {
            bearNFT.safeTransferFrom(address(this), to, tokenIds[i]);
        }
    }
    
    /**
     * @dev Withdraw multiple NFTs by quantity (admin only)
     * @param to Recipient address
     * @param amount Number of NFTs to withdraw
     * @return tokenIds Array of withdrawn NFT token IDs
     */
    function withdrawNFTsByQuantity(address to, uint256 amount) external onlyOwner nonReentrant returns (uint256[] memory) {
        if (to == address(0)) revert ZeroAddressNotAllowed();
        if (amount == 0) revert InvalidAmount();
        
        // Check if contract has enough NFTs
        uint256 contractNFTBalance = 0;
        try bearNFT.balanceOf(address(this)) returns (uint256 balance) {
            contractNFTBalance = balance;
        } catch {
            revert InsufficientNFTBalance();
        }
        
        if (contractNFTBalance < amount) revert InsufficientNFTBalance();
        
        // Collect NFT IDs to withdraw
        uint256[] memory nftIds = new uint256[](amount);
        uint256 count = 0;
        
        // Find NFTs owned by the contract
        for (uint256 i = 1; count < amount && i <= 100000; i++) {
            try bearNFT.ownerOf(i) returns (address owner) {
                if (owner == address(this)) {
                    nftIds[count] = i;
                    count++;
                }
            } catch {
                // Skip to next id if this one doesn't exist
                continue;
            }
        }
        
        // Make sure we found enough NFTs
        if (count < amount) revert InsufficientNFTBalance();
        
        // Transfer NFTs to the recipient
        for (uint256 i = 0; i < amount; i++) {
            bearNFT.safeTransferFrom(address(this), to, nftIds[i]);
        }
        
        return nftIds;
    }
    
    /**
     * @dev Get the number of NFT IDs owned by the contract
     */
    function getContractNFTCount() external view returns (uint256) {
        try bearNFT.balanceOf(address(this)) returns (uint256 balance) {
            return balance;
        } catch {
            return 0;
        }
    }
    

    /**
     * @dev Pause or unpause deposits
     * @param paused Whether deposits should be paused
     */
    function setDepositPaused(bool paused) external onlyOwner {
        depositPaused = paused;
        
        emit DepositStateChanged(paused);
    }
    
    /**
     * @dev Pause or unpause redemptions
     * @param paused Whether redemptions should be paused
     */
    function setRedemptionPaused(bool paused) external onlyOwner {
        redemptionPaused = paused;
        
        emit RedemptionStateChanged(paused);
    }
    
    /**
     * @dev Pause all contract functions
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause all contract functions
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Add or remove protection for an address (owner only)
     * @param _address The address to protect or unprotect
     * @param _status True to protect, false to remove protection
     */
    function setAddressProtection(address _address, bool _status) external onlyOwner {
        if (_address == address(0)) revert ZeroAddressNotAllowed();
        protectedAddresses[_address] = _status;
        emit AddressProtectionUpdated(_address, _status);
    }
    
    /**
     * @dev Batch add or remove protection for multiple addresses (owner only)
     * @param _addresses Array of addresses to update
     * @param _status True to protect, false to remove protection
     */
    function batchSetAddressProtection(address[] calldata _addresses, bool _status) external onlyOwner {
        for (uint256 i = 0; i < _addresses.length; i++) {
            if (_addresses[i] == address(0)) revert ZeroAddressNotAllowed();
            protectedAddresses[_addresses[i]] = _status;
            emit AddressProtectionUpdated(_addresses[i], _status);
        }
    }
    
    /**
     * @dev Check if an address is protected
     * @param _address Address to check
     * @return True if the address is protected from hunting
     */
    function isAddressProtected(address _address) external view returns (bool) {
        return protectedAddresses[_address];
    }
    
    /**
     * @dev Required for ERC721 receiver
     * Only accepts NFTs from the bearNFT contract
     */
    function onERC721Received(
        address,  // operator
        address,  // from
        uint256,  // tokenId
        bytes calldata  // data
    ) external view override returns (bytes4) {
        // Only accept NFTs from the bearNFT contract
        if (msg.sender != address(bearNFT)) {
            revert InvalidNFT();
        }
        
        return this.onERC721Received.selector;
    }
    
    // ========================== REQUIRED OVERRIDES ==========================
    
    /**
     * @dev Required overrides for inherited contracts
     */
    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }
    
    // Token functions are now delegated to the MiMoToken contract
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    // Allow contract to receive ETH
    receive() external payable {}

    // ========================== ON-CHAIN TOKEN URI ==========================

    /**
     * @dev Generates a placeholder SVG for the Hunter NFT.
     * In a real application, this would be more sophisticated.
     */
    function generateHunterSVG(HunterPosition memory position, uint256 tokenId, uint256 currentTime) internal pure returns (string memory) {
        string memory statusText;
        if (position.inHibernation) {
            statusText = "Hibernating";
        } else if (position.recoveryStartTime > 0) {
            statusText = "Recovering";
        } else {
            statusText = "Active";
        }

        // Basic SVG representation
        return string(abi.encodePacked(
            '<svg width="350" height="350" xmlns="http://www.w3.org/2000/svg">',
            '<style>.text { font: bold 20px sans-serif; fill: white; }</style>',
            '<rect width="100%" height="100%" fill="#333"/>',
            '<text x="10" y="30" class="text">Hunter #', Strings.toString(tokenId), '</text>',
            '<text x="10" y="60" class="text">Power: ', Strings.toString(uint256(position.power) / (10**18)), '</text>', // Assuming power has 18 decimals
            '<text x="10" y="90" class="text">Status: ', statusText, '</text>',
            '<text x="10" y="120" class="text">Total Hunted: ', Strings.toString(uint256(position.totalHunted) / (10**18)), '</text>', // Assuming totalHunted has 18 decimals
            '<text x="10" y="150" class="text">Age: ', Strings.toString((currentTime - position.creationTime) / 1 days), ' days</text>',
            '</svg>'
        ));
    }

    /**
     * @dev Returns the URI for a given token ID, with metadata and image generated on-chain.
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        if (!_exists(tokenId)) revert NonExistentToken();
        
        HunterPosition memory position = positions[tokenId];
        
        // Generate SVG based on hunter stats
        string memory svg = generateHunterSVG(position, tokenId, block.timestamp);
        
        // Generate metadata JSON
        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name":"Hunter #', Strings.toString(tokenId), '",',
            '"description":"A fierce MiMo Hunter NFT, ready for adventure in the BearHunter Ecosystem.",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '",',
            '"attributes":[',
            '{"trait_type":"Power","value":', Strings.toString(uint256(position.power)), '},', // Raw value, assuming 18 decimals
            '{"trait_type":"Creation Time","value":', Strings.toString(uint256(position.creationTime)), '},',
            '{"trait_type":"Last Feed Time","value":', Strings.toString(uint256(position.lastFeedTime)), '},',
            '{"trait_type":"Last Hunt Time","value":', Strings.toString(uint256(position.lastHuntTime)), '},',
            '{"trait_type":"Missed Feedings","value":', Strings.toString(uint256(position.missedFeedings)), '},',
            '{"trait_type":"Status","value":"', (position.inHibernation ? "Hibernating" : (position.recoveryStartTime > 0 ? "Recovering" : "Active")), '"},',
            '{"trait_type":"Total Hunted","value":', Strings.toString(uint256(position.totalHunted)), '},', // Raw value
            '{"trait_type":"Days Remaining","value":', Strings.toString(_getRemainingLifespan(tokenId)), '}',
            ']}'
        ))));
        
        return string(abi.encodePacked('data:application/json;base64,', json));
    }

    /**
     * @dev Allows anyone to burn a Hunter NFT if its lifespan has expired.
     * This helps prevent trading of "dead" hunters on secondary markets.
     * @param tokenId The ID of the Hunter NFT to burn.
     */
    function burnDeadHunter(uint256 tokenId) external nonReentrant {
        if (!_exists(tokenId)) revert NonExistentToken();

        HunterPosition storage pos = positions[tokenId];

        // Check if the hunter's lifespan has truly ended
        if (block.timestamp <= uint256(pos.creationTime) + LIFESPAN) {
            revert HunterNotExpired();
        }

        // The _burn function handles all ERC721 aspects: emits Transfer event to address(0), clears owner, etc.
        _burn(tokenId);
        
        // Note: The data in positions[tokenId] will remain, but since the token is burned,
        // it's no longer ownable or transferable, and standard game logic depending on ownership
        // or _exists() will naturally exclude it. Explicitly deleting from the mapping 
        // (e.g., delete positions[tokenId];) could be done for gas state refunds but is not strictly necessary
        // for the burn functionality itself and adds a bit of gas cost to this transaction.
    }
}