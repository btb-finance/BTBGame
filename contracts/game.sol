// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @title BearHunterEcosystem
 * @dev Comprehensive contract that integrates all BEAR & Hunter ecosystem functionality
 * including BTB swapping capabilities
 */
contract BearHunterEcosystem is ERC721Enumerable, Ownable, Pausable, ReentrancyGuard, IERC721Receiver {
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

    // External contract interfaces
    IERC721 public bearNFT;  // Existing BEAR NFT contract
    IERC20 public btbToken;  // Existing BTB token contract
    
    // MiMo token implementation embedded in this contract
    mapping(address => uint256) private _mimoBalances;
    mapping(address => mapping(address => uint256)) private _mimoAllowances;
    uint256 private _mimoTotalSupply;
    string private constant _mimoName = "MiMo Game";
    string private constant _mimoSymbol = "MiMo";
    uint8 private constant _mimoDecimals = 18;
    
    // Hunter struct to store hunter attributes
    struct Hunter {
        uint256 creationTime;       // When the hunter was created
        uint256 lastFeedTime;       // Last time hunter was fed
        uint256 lastHuntTime;       // Last time hunter hunted
        uint256 power;              // Current hunting power (base is 10 * 10^18)
        uint256 missedFeedings;     // Consecutive missed feedings
        bool inHibernation;         // Whether hunter is in hibernation
        uint256 recoveryStartTime;  // When hunter started recovery from hibernation
        uint256 totalHunted;        // Total amount of MiMo tokens hunted
    }
    
    // Constants for MIMO token and deposits/redemptions
    uint256 public constant DEPOSIT_MIMO_REWARD = 1_000_000 * 10**18; // 1M MiMo tokens
    uint256 public constant REDEMPTION_MIMO_AMOUNT = 1_000_000 * 10**18; // 1M MiMo tokens
    uint256 public constant REDEMPTION_FEE_PERCENTAGE = 10; // 10% fee on redemption
    
    // Constants for Hunter mechanics
    uint256 private constant BASE_POWER = 20 * 10**18;  // 20 MiMo per day base power
    uint256 private constant LIFESPAN = 365 days;       // Hunter lifespan
    uint256 private constant MISSED_FEEDING_PENALTY = 30; // 30% power reduction after hibernation
    uint256 private constant HIBERNATION_THRESHOLD = 7;   // 7 missed feedings causes hibernation
    uint256 private constant RECOVERY_PERIOD = 1 days;    // 24 hours to recover from hibernation
    uint256 private constant HUNT_COOLDOWN = 24 hours;    // Can hunt once every 24 hours
    uint256 private constant GROWTH_RATE = 200;          // 2% power increase for feeding (in basis points)
    
    // Pause states for different actions
    bool public depositPaused;
    bool public redemptionPaused;
    
    // Address that receives fee portion of MiMo
    address public feeReceiver;
    
    // Base URI for Hunter NFT metadata
    string private _baseURIValue;
    
    // Mapping to track protected addresses (can't be hunted from)
    mapping(address => bool) public protectedAddresses;
    
    // Hunt reward distribution percentages (in basis points)
    uint256 public ownerRewardPercentage = 5000;    // 50% to hunter owner
    uint256 public burnPercentage = 2500;           // 25% burned
    uint256 public liquidityPercentage = 2500;      // 25% to liquidity
    
    // Address that receives liquidity portion
    address public liquidityReceiver;
    
    // Mapping from token ID to Hunter struct
    mapping(uint256 => Hunter) public hunters;
    
    // ========================== BTBSwap Variables ==========================
    
    // Swap status
    bool public swapPaused;
    
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
    constructor(
        address _bearNFT,
        address _btbToken,
        address _liquidityReceiver,
        address _feeReceiver,
        address initialOwner
    ) ERC721("Hunter", "HNTR") Ownable(initialOwner) {
        if (_bearNFT == address(0) || _btbToken == address(0) ||
            _liquidityReceiver == address(0) || _feeReceiver == address(0)) revert ZeroAddressNotAllowed();
        
        bearNFT = IERC721(_bearNFT);
        btbToken = IERC20(_btbToken);
        liquidityReceiver = _liquidityReceiver;
        feeReceiver = _feeReceiver;
        
        // Set default base URI for Hunter metadata
        _baseURIValue = "https://metadata.example.com/hunters/";
        
        // Initialize BTBSwap defaults
        swapPaused = false;
    }
    
    // ========================== MIMO TOKEN FUNCTIONS ==========================
    
    /**
     * @dev Returns the name of the token
     */
    function mimoName() public pure returns (string memory) {
        return _mimoName;
    }
    
    /**
     * @dev Returns the symbol of the token
     */
    function mimoSymbol() public pure returns (string memory) {
        return _mimoSymbol;
    }
    
    /**
     * @dev Returns the decimals places of the token
     */
    function mimoDecimals() public pure returns (uint8) {
        return _mimoDecimals;
    }
    
    /**
     * @dev Returns the amount of tokens in existence
     */
    function mimoTotalSupply() public view returns (uint256) {
        return _mimoTotalSupply;
    }
    
    /**
     * @dev Returns the amount of tokens owned by `account`
     */
    function mimoBalanceOf(address account) public view returns (uint256) {
        return _mimoBalances[account];
    }
    
    /**
     * @dev Moves `amount` tokens from the caller's account to `to`
     */
    function mimoTransfer(address to, uint256 amount) public returns (bool) {
        address owner = msg.sender;
        _mimoTransfer(owner, to, amount);
        return true;
    }
    
    /**
     * @dev Returns the remaining number of tokens that `spender` will be allowed to spend
     * on behalf of `owner`
     */
    function mimoAllowance(address owner, address spender) public view returns (uint256) {
        return _mimoAllowances[owner][spender];
    }
    
    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens
     */
    function mimoApprove(address spender, uint256 amount) public returns (bool) {
        address owner = msg.sender;
        _mimoApprove(owner, spender, amount);
        return true;
    }
    
    /**
     * @dev Moves `amount` tokens from `from` to `to` using the allowance mechanism
     */
    function mimoTransferFrom(address from, address to, uint256 amount) public returns (bool) {
        address spender = msg.sender;
        _mimoSpendAllowance(from, spender, amount);
        _mimoTransfer(from, to, amount);
        return true;
    }
    
    /**
     * @dev Destroys `amount` tokens from the caller
     */
    function mimoBurn(uint256 amount) public {
        _mimoBurn(msg.sender, amount);
    }
    
    /**
     * @dev Internal function to mint MiMo tokens
     */
    function _mimoMint(address account, uint256 amount) internal {
        if (account == address(0)) revert ZeroAddressNotAllowed();
        
        _mimoTotalSupply += amount;
        unchecked {
            _mimoBalances[account] += amount;
        }
        emit MiMoTransfer(address(0), account, amount);
    }
    
    /**
     * @dev Internal function to burn MiMo tokens
     */
    function _mimoBurn(address account, uint256 amount) internal {
        if (account == address(0)) revert ZeroAddressNotAllowed();
        
        uint256 accountBalance = _mimoBalances[account];
        if (accountBalance < amount) revert InsufficientTokenBalance();
        
        unchecked {
            _mimoBalances[account] = accountBalance - amount;
            _mimoTotalSupply -= amount;
        }
        
        emit MiMoTransfer(account, address(0), amount);
        emit MiMoBurned(account, amount);
    }
    
    /**
     * @dev Internal function to transfer MiMo tokens
     */
    function _mimoTransfer(address from, address to, uint256 amount) internal {
        if (from == address(0)) revert ZeroAddressNotAllowed();
        if (to == address(0)) revert ZeroAddressNotAllowed();
        
        uint256 fromBalance = _mimoBalances[from];
        if (fromBalance < amount) revert InsufficientTokenBalance();
        
        unchecked {
            _mimoBalances[from] = fromBalance - amount;
            _mimoBalances[to] += amount;
        }
        
        emit MiMoTransfer(from, to, amount);
    }
    
    /**
     * @dev Internal function to approve MiMo tokens
     */
    function _mimoApprove(address owner, address spender, uint256 amount) internal {
        if (owner == address(0)) revert ZeroAddressNotAllowed();
        if (spender == address(0)) revert ZeroAddressNotAllowed();
        
        _mimoAllowances[owner][spender] = amount;
        emit MiMoApproval(owner, spender, amount);
    }
    
    /**
     * @dev Internal function to spend MiMo token allowance
     */
    function _mimoSpendAllowance(address owner, address spender, uint256 amount) internal {
        uint256 currentAllowance = _mimoAllowances[owner][spender];
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < amount) revert InsufficientTokenAllowance();
            unchecked {
                _mimoApprove(owner, spender, currentAllowance - amount);
            }
        }
    }
    
    // ========================== HUNTER NFT FUNCTIONS ==========================
    
    /**
     * @dev Set the base URI for metadata
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseURIValue = baseURI;
    }
    
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
            // Skip invalid tokens
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
        if (ownerOf(tokenId) != msg.sender) revert NotHunterOwner();
        
        Hunter storage hunter = hunters[tokenId];
        
        // Check if hunter is expired (beyond lifespan)
        if (block.timestamp > hunter.creationTime + LIFESPAN) revert HunterExpired();
        
        // Check if already fed today (using 20 hours instead of 24 for buffer)
        if (block.timestamp < hunter.lastFeedTime + 20 hours) revert AlreadyFedToday();
        
        // If in hibernation, start recovery process
        if (hunter.inHibernation) {
            hunter.inHibernation = false;
            hunter.recoveryStartTime = block.timestamp;
            emit HunterRecovered(tokenId, hunter.power);
            hunter.lastFeedTime = block.timestamp;
            hunter.missedFeedings = 0;
            return;
        }
        
        // If in recovery period, can feed but no power increase yet
        if (hunter.recoveryStartTime > 0 && block.timestamp < hunter.recoveryStartTime + RECOVERY_PERIOD) {
            hunter.lastFeedTime = block.timestamp;
            hunter.missedFeedings = 0;
            return;
        }
        
        // Reset recovery state if completed
        if (hunter.recoveryStartTime > 0 && block.timestamp >= hunter.recoveryStartTime + RECOVERY_PERIOD) {
            hunter.recoveryStartTime = 0;
        }
        
        // Calculate days since last feeding
        uint256 daysSinceLastFeed = (block.timestamp - hunter.lastFeedTime) / 1 days;
        
        // If missed more than 1 day of feeding, don't increase power
        if (daysSinceLastFeed <= 1) {
            // Increase power by growth rate (2% daily)
            uint256 powerIncrease = (hunter.power * GROWTH_RATE) / 10000;
            hunter.power += powerIncrease;
            hunter.missedFeedings = 0;
        } else {
            // Record consecutive missed feedings
            hunter.missedFeedings += daysSinceLastFeed - 1;
            
            // If reached hibernation threshold, enter hibernation
            if (hunter.missedFeedings >= HIBERNATION_THRESHOLD) {
                hunter.inHibernation = true;
                // Reduce power by penalty percentage
                hunter.power = hunter.power * (10000 - MISSED_FEEDING_PENALTY) / 10000;
                emit HunterHibernated(tokenId);
            }
        }
        
        // Update last feed time
        hunter.lastFeedTime = block.timestamp;
        
        emit HunterFed(tokenId, hunter.power);
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
        
        Hunter storage hunter = hunters[tokenId];
        
        // Check if hunter is expired (beyond lifespan)
        if (block.timestamp > hunter.creationTime + LIFESPAN) revert HunterExpired();
        
        // Check if hunter is in hibernation
        if (hunter.inHibernation) revert HunterInHibernation();
        
        // Check if hunter is still recovering
        if (hunter.recoveryStartTime > 0 && block.timestamp < hunter.recoveryStartTime + RECOVERY_PERIOD) {
            revert MustWaitForRecovery();
        }
        
        // Check if hunt cooldown is active
        if (block.timestamp < hunter.lastHuntTime + HUNT_COOLDOWN) revert HuntCooldownActive();
        
        // Call internal function to hunt from a single target
        _hunt(tokenId, target);
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
        
        Hunter storage hunter = hunters[tokenId];
        
        // Check if hunter is expired (beyond lifespan)
        if (block.timestamp > hunter.creationTime + LIFESPAN) revert HunterExpired();
        
        // Check if hunter is in hibernation
        if (hunter.inHibernation) revert HunterInHibernation();
        
        // Check if hunter is still recovering
        if (hunter.recoveryStartTime > 0 && block.timestamp < hunter.recoveryStartTime + RECOVERY_PERIOD) {
            revert MustWaitForRecovery();
        }
        
        // Check if hunt cooldown is active
        if (block.timestamp < hunter.lastHuntTime + HUNT_COOLDOWN) revert HuntCooldownActive();
        
        // Hunt from each target in the array
        for (uint256 i = 0; i < targets.length; i++) {
            // Skip protected addresses
            address targetAddress = targets[i] == address(0) ? msg.sender : targets[i];
            if (protectedAddresses[targetAddress]) {
                continue;
            }
            
            // Skip targets with zero balance
            if (_mimoBalances[targetAddress] == 0) {
                continue;
            }
            
            // Try to hunt from this target
            _hunt(tokenId, targetAddress);
        }
    }
    
    /**
     * @dev Internal function to hunt from a target and increase hunter power
     * @param tokenId The Hunter NFT ID to use for hunting
     * @param target The target address to hunt from
     */
    function _hunt(uint256 tokenId, address target) internal {
        // If no target is specified, msg.sender is used (now obsolete, keeping for backward compatibility)
        address targetAddress = target == address(0) ? msg.sender : target;
        
        // Get hunter data
        Hunter storage hunter = hunters[tokenId];
        
        // Calculate hunt amount based on hunter power
        uint256 huntAmount = hunter.power;
        
        // If target has less than the full hunt amount, hunt whatever is available
        if (_mimoBalances[targetAddress] < huntAmount) {
            huntAmount = _mimoBalances[targetAddress];
            
            // If target has no tokens at all, revert
            if (huntAmount == 0) revert InsufficientTargetBalance();
        }
        
        // Update hunter stats
        hunter.lastHuntTime = block.timestamp;
        hunter.totalHunted += huntAmount;
        
        // No power increase for hunting to save gas
        
        // Auto-feed the hunter to get another 1% power increase
        // Only if the hunter hasn't been fed today and isn't in recovery
        if (block.timestamp >= hunter.lastFeedTime + 20 hours && 
            (hunter.recoveryStartTime == 0 || block.timestamp >= hunter.recoveryStartTime + RECOVERY_PERIOD)) {
            
            // Calculate additional power increase from feeding
            uint256 feedPowerIncrease = (hunter.power * GROWTH_RATE) / 10000; // 2% from feeding
            hunter.power += feedPowerIncrease;
            
            // Update feeding-related stats
            hunter.lastFeedTime = block.timestamp;
            hunter.missedFeedings = 0;
            
            // Emit feeding event
            emit HunterFed(tokenId, hunter.power);
        }
        
        // Calculate reward distribution
        uint256 ownerReward = (huntAmount * ownerRewardPercentage) / 10000;
        uint256 burnAmount = (huntAmount * burnPercentage) / 10000;
        uint256 liquidityAmount = (huntAmount * liquidityPercentage) / 10000;
        
        // Transfer tokens from target to hunter owner
        _mimoTransfer(targetAddress, msg.sender, ownerReward);
        
        // Transfer liquidity portion from target
        _mimoTransfer(targetAddress, liquidityReceiver, liquidityAmount);
        
        // Burn tokens from target
        _mimoBurn(targetAddress, burnAmount);
        
        emit HunterHunted(tokenId, huntAmount, ownerReward, burnAmount, liquidityAmount);
    }
    
    /**
     * @dev Get hunter stats
     */
    function getHunterStats(uint256 tokenId) external view returns (
        uint256 creationTime,
        uint256 lastFeedTime,
        uint256 lastHuntTime,
        uint256 power,
        uint256 missedFeedings,
        bool inHibernation,
        uint256 recoveryStartTime,
        uint256 totalHunted,
        uint256 daysRemaining
    ) {
        if (!_exists(tokenId)) revert NonExistentToken();
        
        Hunter storage hunter = hunters[tokenId];
        
        return (
            hunter.creationTime,
            hunter.lastFeedTime,
            hunter.lastHuntTime,
            hunter.power,
            hunter.missedFeedings,
            hunter.inHibernation,
            hunter.recoveryStartTime,
            hunter.totalHunted,
            _getRemainingLifespan(tokenId)
        );
    }
    
    /**
     * @dev Get remaining lifespan in days
     */
    function _getRemainingLifespan(uint256 tokenId) internal view returns (uint256) {
        Hunter storage hunter = hunters[tokenId];
        
        uint256 endTime = hunter.creationTime + LIFESPAN;
        if (block.timestamp >= endTime) {
            return 0;
        }
        
        return (endTime - block.timestamp) / 1 days;
    }
    
    /**
     * @dev Check if hunter is currently active (not hibernating, not recovering, not expired)
     */
    function isHunterActive(uint256 tokenId) external view returns (bool) {
        if (!_exists(tokenId)) revert NonExistentToken();
        
        Hunter storage hunter = hunters[tokenId];
        
        // Check if expired
        if (block.timestamp > hunter.creationTime + LIFESPAN) {
            return false;
        }
        
        // Check if hibernating
        if (hunter.inHibernation) {
            return false;
        }
        
        // Check if recovering
        if (hunter.recoveryStartTime > 0 && block.timestamp < hunter.recoveryStartTime + RECOVERY_PERIOD) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Check if hunter can hunt now
     */
    function canHunt(uint256 tokenId) external view returns (bool, string memory reason) {
        if (!_exists(tokenId)) return (false, "Hunter does not exist");
        
        // Check if hunter target address is protected
        address owner = ownerOf(tokenId);
        if (protectedAddresses[owner]) 
            return (false, "Target address is protected");
        
        Hunter storage hunter = hunters[tokenId];
        
        // Check if expired
        if (block.timestamp > hunter.creationTime + LIFESPAN) 
            return (false, "Hunter has expired");
        
        // Check if hibernating
        if (hunter.inHibernation) 
            return (false, "Hunter is in hibernation");
        
        // Check if recovering
        if (hunter.recoveryStartTime > 0 && block.timestamp < hunter.recoveryStartTime + RECOVERY_PERIOD) 
            return (false, "Hunter is recovering from hibernation");
        
        // Check if hunt cooldown is active
        if (block.timestamp < hunter.lastHuntTime + HUNT_COOLDOWN) {
            uint256 timeLeft = (hunter.lastHuntTime + HUNT_COOLDOWN) - block.timestamp;
            return (false, string(abi.encodePacked("Hunt cooldown active: ", Strings.toString(timeLeft / 3600), " hours left")));
        }
        
        return (true, "Hunter can hunt");
    }
    
    /**
     * @dev Base URI for computing tokenURI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseURIValue;
    }
    
    /**
     * @dev Returns whether `tokenId` exists.
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
    
    /**
     * @dev Override _beforeTokenTransfer to prevent transferring hibernating hunters
     */
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        override(ERC721Enumerable) 
        returns (address) 
    {
        if (to != address(0)) { // Not burning
            Hunter storage hunter = hunters[tokenId];
            if (hunter.inHibernation) revert CannotTransferHibernatingHunter();
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
        uint256 tokenId = totalSupply() + 1;
        
        // Initialize hunter with base attributes
        hunters[tokenId] = Hunter({
            creationTime: block.timestamp,
            lastFeedTime: block.timestamp,
            lastHuntTime: block.timestamp,
            power: BASE_POWER,
            missedFeedings: 0,
            inHibernation: false,
            recoveryStartTime: 0,
            totalHunted: 0
        });
        
        _safeMint(to, tokenId);
        
        emit HunterCreated(tokenId, to, BASE_POWER);
        
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
        if (_mimoBalances[msg.sender] < totalAmountRequired) revert InsufficientTokenBalance();
        
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
        if (_mimoBalances[msg.sender] < totalAmount) revert InsufficientTokenBalance();
        
        // Check if contract has BEAR NFTs available
        if (bearNFT.balanceOf(address(this)) == 0) revert InsufficientNFTBalance();
        
        // Transfer fee portion to fee receiver (deduct from user balance)
        _mimoTransfer(msg.sender, feeReceiver, feeAmount);
        
        // Burn the redemption amount
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
        override(ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }
    
    // Standard ERC20 functions for external compatibility
    function transfer(address to, uint256 amount) public returns (bool) {
        address from = msg.sender;
        if (from == address(0)) revert ZeroAddressNotAllowed();
        if (to == address(0)) revert ZeroAddressNotAllowed();
        
        uint256 fromBalance = _mimoBalances[from];
        if (fromBalance < amount) revert InsufficientTokenBalance();
        
        unchecked {
            _mimoBalances[from] = fromBalance - amount;
            _mimoBalances[to] += amount;
        }
        
        emit MiMoTransfer(from, to, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        address spender = msg.sender;
        
        uint256 currentAllowance = _mimoAllowances[from][spender];
        if (currentAllowance < amount) revert InsufficientTokenAllowance();
        
        if (from == address(0)) revert ZeroAddressNotAllowed();
        if (to == address(0)) revert ZeroAddressNotAllowed();
        
        uint256 fromBalance = _mimoBalances[from];
        if (fromBalance < amount) revert InsufficientTokenBalance();
        
        unchecked {
            _mimoAllowances[from][spender] = currentAllowance - amount;
            _mimoBalances[from] = fromBalance - amount;
            _mimoBalances[to] += amount;
        }
        
        emit MiMoTransfer(from, to, amount);
        return true;
    }
    
    function balanceOf(address account) public view returns (uint256) {
        return _mimoBalances[account];
    }
    
    function totalSupply() public view returns (uint256) {
        return _mimoTotalSupply;
    }
    
    function allowance(address owner, address spender) public view returns (uint256) {
        return _mimoAllowances[owner][spender];
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        address owner = msg.sender;
        if (owner == address(0)) revert ZeroAddressNotAllowed();
        if (spender == address(0)) revert ZeroAddressNotAllowed();
        
        _mimoAllowances[owner][spender] = amount;
        
        emit MiMoApproval(owner, spender, amount);
        return true;
    }
    
    function decimals() public pure returns (uint8) {
        return _mimoDecimals;
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId) || 
               interfaceId == type(IERC20).interfaceId || 
               interfaceId == type(IERC20Metadata).interfaceId;
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}