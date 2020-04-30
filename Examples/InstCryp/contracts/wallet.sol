pragma solidity ^0.5.0;

import "./IERC20.sol";

contract walletStorage {
    
    struct Transfer {
        address contract_;
        address to_;
        uint256 amount_;
        bool failed_;
        string hash;
    }

    mapping(address => uint256[]) public transactionIndexesToSender;
    mapping(bytes32 => address) public tokens;
    
    mapping(address => address) public biconomyAddressMappings;
    mapping(address => bool) public biconomyAddressLoggedIn;
    
    IERC20 public ERC20Interface;
    Transfer[] public transactions;
    address public owner;
    
    event TransferSuccessful(address indexed from_, address indexed to_, uint256 amount_);
    event TransferFailed(address indexed from_, address indexed to_, uint256 amount_);
}

contract wallet is walletStorage{
    
    constructor() public {
        owner = msg.sender;
    }
    
    modifier onlyOwner {
        require(owner == msg.sender);
        _;
    }
    
    modifier isLoggedIn(address userAddress) {
        require(!isLoggedInUserADdress(userAddress));
        _;
    }
    
    // Biconomy Login 
    function biconomyLogin(address userAddress, address _biconomyAddress) isLoggedIn(userAddress) external {
        biconomyAddressMappings[userAddress] = _biconomyAddress;
        biconomyAddressLoggedIn[userAddress] = true;
    }
    
    function isLoggedInUserADdress(address userAddress) public view returns(bool) {
        return biconomyAddressLoggedIn[userAddress];
    } 
    
    function getBiconomyAddress(address userAddress) public view returns(address) {
        return biconomyAddressMappings[userAddress];
    }     
    
    // Add new Token Support to wallet
    function addNewToken(bytes32 symbol_, address address_) public onlyOwner returns (bool) {
        tokens[symbol_] = address_;
        return true;
    }
    
    function removeToken(bytes32 symbol_) public onlyOwner returns (bool) {
        require(tokens[symbol_] != address(0));
        delete(tokens[symbol_]);
        return true;
    }
    
    function transferFromTokens(address from_, bytes32 symbol_, address to_, uint256 amount_) public {
        // require(from_ == msg.sender);
        require(tokens[symbol_] != address(0));
        require(amount_ > 0);

        address contract_ = tokens[symbol_];
        ERC20Interface =  IERC20(contract_);
        
        if(amount_ > ERC20Interface.allowance(from_, address(this))) {
            emit TransferFailed(from_, to_, amount_);
            revert();
        }

        // uint256 transactionId = transactions.push(
        //     Transfer({
        //         contract_:  contract_,
        //         to_: to_,
        //         amount_: amount_,
        //         failed_: true
        //     })
        // );

        // transactionIndexesToSender[from_].push(transactionId - 1);

        ERC20Interface.transferFrom(from_, to_, amount_);
        // transactions[transactionId - 1].failed_ = false;
        emit TransferSuccessful(from_, to_, amount_);
    }
    
    function addTransaction(address from, bytes32 symbol_, address to_, uint256 amount_, string memory _hash) public {
        require(from == msg.sender);
        require(tokens[symbol_] != address(0));
        require(amount_ > 0);

        address contract_ = tokens[symbol_];
        
        uint256 transactionId = transactions.push(
            Transfer({
                contract_:  contract_,
                to_: to_,
                amount_: amount_,
                failed_: false,
                hash: _hash
            })
        );
        transactionIndexesToSender[msg.sender].push(transactionId - 1);
    }
    
    function transferTokens(bytes32 symbol_, address to_, uint256 amount_) public {
        require(tokens[symbol_] != address(0));
        require(amount_ > 0);

        address contract_ = tokens[symbol_];
        ERC20Interface =  IERC20(contract_);
        
        // if(amount_ > ERC20Interface.balanceOf(msg.sender)) {
        //     revert();
        // }

        // uint256 transactionId = transactions.push(
        //     Transfer({
        //         contract_:  contract_,
        //         to_: to_,
        //         amount_: amount_,
        //         failed_: true
        //     })
        // );

        // transactionIndexesToSender[msg.sender].push(transactionId - 1);

        ERC20Interface.transfer(to_, amount_);
        // transactions[transactionId - 1].failed_ = false;
    }
    
    function getTransactionsIdsByAddress(address userAddress) public view returns(uint256[] memory) {
        return transactionIndexesToSender[userAddress];
    }
    
    function getTransactionDetailsById(uint256 _id) public view returns(address, address, uint256, bool, string memory) {
        return (
            transactions[_id].contract_,
            transactions[_id].to_,
            transactions[_id].amount_,
            transactions[_id].failed_,
            transactions[_id].hash
        );
    }
}