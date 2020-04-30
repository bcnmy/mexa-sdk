import React, { Component } from 'react';
import { Button, Form, Grid, Input, Dropdown, Segment, Message, Header, Container, List, Label} from 'semantic-ui-react';
import Layout from '../components/Layout';
import { Router  } from '../routes';
import biconomy from '../biconomyProvider/biconomy';
import web3 from '../biconomyProvider/web3Biconomy';
import realweb3 from '../biconomyProvider/realweb3';
import permitDai from "./functions/permitDai";
import { ToastContainer, toast } from 'react-toastify';
import {getERCContractInstance, getWalletContractInstance} from './functions/contractinstance'

import {
    transferErc20,
    transferFromTokens,
    biconomyLogin,
    addTransaction,
} from './functions/wallet'

class Index extends Component {

    state = {
        tokenSymbol: 'DAI',
        sendLoanding: false,
        recipientAddress: '',
        value: '',
        collateralTokenSymbol: 'KNC',
        collateralUploadLoading: false,
        collateralValue: '',
        metamaskAddress: 'Not Logged in',
        biconomyAddress: 'Not Logged in',
        biconomyLoginLoading: false,
        transactionLoading: false
    }

    onBiconomyLogin = async () => {
        try {
            this.setState({biconomyLoginLoading:true});
            var accounts = await web3.eth.getAccounts();
            var walletAddress = '0xD16AdDBF04Bd39DC2Cb7F87942F904D4a7B8281B'; // spender address kovan
            const contractInstance = getWalletContractInstance(web3, walletAddress);
            const bAddress = await contractInstance.methods.getBiconomyAddress(accounts[0]).call();
            if(bAddress == "0x0000000000000000000000000000000000000000" || bAddress == "") {
                let response = await biconomy.login(accounts[0]);
                if(response && response.transactionHash) {
                    console.log("Please wait...");
                    await biconomyLogin(web3, contractInstance, response.userContract);
                    this.setState({
                        biconomyAddress: response.userContract,
                        metamaskAddress: accounts[0]
                    });
                } else if (response && response.userContract) {
                    console.log("Successfully logged in...");
                    console.log(response.userContract);
                    await biconomyLogin(web3, contractInstance, response.userContract);
                    this.setState({
                        biconomyAddress: response.userContract,
                        metamaskAddress: accounts[0]
                    });
                }
            } else {
                this.setState({
                    biconomyAddress: bAddress,
                    metamaskAddress: accounts[0]
                });
            }
            toast.success("You are logged in !", {
                position: toast.POSITION.TOP_RIGHT
            });
            this.setState({biconomyLoginLoading:false});
        } catch (error) {
            this.setState({biconomyLoginLoading:false});
            alert("Error")
            alert(error);
        }
    };

    onAddCollateral = async () => {
        event.preventDefault();
        try {
            this.setState({collateralUploadLoading:true});
            var accounts = await web3.eth.getAccounts();
            var walletAddress = '0xD16AdDBF04Bd39DC2Cb7F87942F904D4a7B8281B'; // spender address kovan
            const contractInstance = getWalletContractInstance(web3, walletAddress);
            const biconomyAddress = await contractInstance.methods.getBiconomyAddress(accounts[0]).call();

            if(biconomyAddress != "0x0000000000000000000000000000000000000000" || biconomyAddress != "") {
                var collateralTokenSymbol = this.state.collateralTokenSymbol;
                var collateralValue = this.state.collateralValue;
                const _inst = await getERCContractInstance(realweb3, collateralTokenSymbol);
                await  transferErc20(realweb3, _inst, biconomyAddress, collateralValue); //transfer collateral for meta transaction
                toast.success("You have deposited Crypto for meta transaction !", {
                    position: toast.POSITION.TOP_RIGHT
                });
            } else {
                toast.warn("Please first login to biconomy using above biconomy button !", {
                    position: toast.POSITION.TOP_RIGHT
                });
            }
            this.setState({collateralUploadLoading:false});
        } catch (error) {
            this.setState({collateralUploadLoading:false});
            console.log(error);
        }
    }

    onSubmit = async () => {
        event.preventDefault();
        try{
            this.setState({sendLoanding:true});
            var recipientAddress = this.state.recipientAddress;
            var value = this.state.value;
            var walletAddress = '0xD16AdDBF04Bd39DC2Cb7F87942F904D4a7B8281B'; // spender address kovan
            // var walletAddress = '0xD873e8f6ca19ec11960FBc43b78991ca2CdA2626'; // spender address ropsten 

            var accounts = await web3.eth.getAccounts();
            console.log(accounts);
            var tokenSymbol = this.state.tokenSymbol; 
            // DAI 0x4441490000000000000000000000000000000000000000000000000000000000
            // TKN 0x544b4e0000000000000000000000000000000000000000000000000000000000
            const contractInstance = getWalletContractInstance(web3, walletAddress);
            const biconomyAddress = await contractInstance.methods.getBiconomyAddress(accounts[0]).call();

            if(tokenSymbol == "DAI"){
                const _inst = await getERCContractInstance(web3, this.state.tokenSymbol);
                const permitBalance = await _inst.methods.allowance(accounts[0], walletAddress).call();
                if(parseInt(permitBalance) >= parseInt(value)){
                    const hash = await transferFromTokens(web3, walletAddress, tokenSymbol, recipientAddress, parseInt(value));
                    toast.success("You have transferred " + value +" DAI !", {
                        position: toast.POSITION.TOP_RIGHT
                    });
                    await addTransaction(web3, contractInstance, biconomyAddress, tokenSymbol, recipientAddress, parseInt(value), hash);
                    toast.success("Transaction Hash: "+ hash, {
                        position: toast.POSITION.TOP_RIGHT
                    });
                    toast.success("Transaction added to transaction history !", {
                        position: toast.POSITION.TOP_RIGHT
                    });
                } else {
                    alert("You need to first give permit to access your balance to wallet.");
                    await permitDai(web3, accounts[0], walletAddress);
                    toast.success("You have given permission to transfer DAI !", {
                        position: toast.POSITION.TOP_RIGHT
                    });
                }
            } else {
                if(biconomyAddress != "0x0000000000000000000000000000000000000000" || biconomyAddress != "") {
                    const _inst = await getERCContractInstance(web3, this.state.tokenSymbol);
                    const biconomyAddressBalance = await _inst.methods.balanceOf(biconomyAddress).call();
                    if(parseInt(biconomyAddressBalance) >= parseInt(value)){    
                        const hash = await transferErc20(web3, _inst, recipientAddress, parseInt(value)); //transfer
                        toast.success("You have transferred " + value + " " + this.state.tokenSymbol, {
                            position: toast.POSITION.TOP_RIGHT
                        });
                        await addTransaction(web3, contractInstance, biconomyAddress, tokenSymbol, recipientAddress, parseInt(value), hash);
                        toast.success("Transaction Hash: "+ hash, {
                            position: toast.POSITION.TOP_RIGHT
                        });
                        toast.success("Transaction added to transaction history !", {
                            position: toast.POSITION.TOP_RIGHT
                        });
                    } else {
                        toast.error("Not Enough Deposit crypto in biconomy account address. Plase deposit crypto by Deposit section.", {
                            position: toast.POSITION.TOP_RIGHT
                        });
                    }
                } else {
                    toast.error("Please first login to biconomy using above biconomy button.", {
                        position: toast.POSITION.TOP_RIGHT
                    });
                }
                // try{
                //     let response = await biconomy.login(accounts[0]);
                //     if(response && response.transactionHash) {
                //         console.log("Please wait...");
                //     } else if (response && response.userContract) {
                        
                //         console.log("Successfully logged in...");
                        // console.log(response);
                        // const _inst = await getERCContractInstance(web3, this.state.tokenSymbol);
                        // console.log(_inst);

                        // const walletInstance = await getWalletContractInstance(web3, walletAddress);
                        // await approve(web3, _inst, walletAddress, parseInt(value));
                        // await transferTokens(web3, walletAddress, this.state.tokenSymbol, recipientAddress, parseInt(value)); // transferFrom
                        // await transferErc20(web3, _inst, recipientAddress, parseInt(value)); //transfer
                        // await addTransaction(web3, contractInstance, tokenSymbol, recipientAddress, parseInt(value));
                        // console.log("Done");
                //     }
                // } catch(error) {
                // console.log(`Error Code: ${error.code} Error Message: ${error.message}`);
                // }
            }
            this.setState({sendLoanding:false});
        }catch(err){
            this.setState({sendLoanding:false});
            alert(err);
        }
    };

    onTransactionHistory = async () => {
        event.preventDefault();
        try{
            this.setState({transactionLoading:true});
            Router.pushRoute(`/transactionHistory`);
        }catch(err){
            alert(err);
            this.setState({transactionLoading:false});
        }
    };

    handleChangeTokenSymbol =  (e, { value }) => this.setState({ tokenSymbol: value }); 
    handleChangeCollateralTokenSymbol =  (e, { value }) => this.setState({ collateralTokenSymbol: value }); 

    render() {

        const options = [
            { key: 'dai', text: 'DAI', value: 'DAI' },
            { key: 'eth', text: 'ETH', value: 'ETH' },
            { key: 'bat', text: 'BAT', value: 'BAT' },
            { key: 'knc', text: 'KNC', value: 'KNC' },
            { key: 'zil', text: 'ZIL', value: 'ZIL' },
            { key: 'tkn', text: 'TKN', value: 'TKN' },
        ]

        const collateralOptions = [
            { key: 'eth', text: 'ETH', value: 'ETH' },
            { key: 'bat', text: 'BAT', value: 'BAT' },
            { key: 'knc', text: 'KNC', value: 'KNC' },
            { key: 'zil', text: 'ZIL', value: 'ZIL' },
            { key: 'tkn', text: 'TKN', value: 'TKN' },
        ]

        return (
            <Layout>
                <ToastContainer/>
                    <Container>
                        <Grid columns={2} divided stackable >
                            <Grid.Row verticalalign='middle' style={{margin:'10px'}}>
                                <Grid.Column width={8}>
                                    <Label color="green" size="large" tag>
                                        InstCryp is Defi crypto wallet supported by meta transaction(By Biconomy-Mexa SDK) 
                                        to transfer erc20 tokens to any address.
                                    </Label>
                                </Grid.Column>
                            </Grid.Row>
                        </Grid>

                    <Segment style={{backgroundColor:"#f5f5f5"}}>
                        <Grid columns={2} divided stackable >
                            <Grid.Row verticalalign='middle' style={{margin:'10px'}}>
                                <Grid.Column width={8}>
                                    <Form onSubmit={this.onBiconomyLogin}>
                                        <Form.Field>
                                            <Button 
                                                color="black"
                                                bsStyle="primary" 
                                                type="submit"
                                                loading={this.state.biconomyLoginLoading}> 
                                                Biconomy Login +
                                            </Button>
                                        </Form.Field>
                                        <Message info>
                                            <Message.Header style={{ overflowWrap: 'break-word'}}>Metamask Address: {this.state.metamaskAddress}</Message.Header>
                                            <Message.Header style={{ overflowWrap: 'break-word'}}>Biconomy Address: {this.state.biconomyAddress}</Message.Header>
                                        </Message>
                                    </Form>
                                </Grid.Column>
                                    <Grid.Column width={8}>
                                    <Form onSubmit={this.onTransactionHistory}>
                                        <Form.Field>
                                            <Button 
                                                color="black"
                                                bsStyle="primary" 
                                                type="submit"
                                                loading={this.state.transactionLoading}> 
                                                Transaction history
                                            </Button>
                                        </Form.Field>
                                        <Message info>
                                            Crypto Transaction History within Instcryp
                                        </Message>
                                    </Form>
                                    </Grid.Column>
                            </Grid.Row>
                        </Grid>
                    </Segment>

                    
                <Segment style={{marginTop:'30px'}}>
                    <Grid stackable textAlign='center' style={{margin:"20px"}}>
                        <Grid.Row verticalalign='middle'>
                            <Grid.Column>
                                <Message>
                                    <Message.Header>Transfer Section</Message.Header>
                                    Transfer crypto token via meta-transaction or gasless on top of Biconomy
                                </Message>
                            </Grid.Column>
                        </Grid.Row>
                        <Grid.Row verticalalign='middle'>
                            <Grid.Column>
                                <Form.Field>
                                    <Input
                                        label={
                                            <Dropdown
                                                options={options}
                                                value={this.state.tokenSymbol} 
                                                onChange={this.handleChangeTokenSymbol} 
                                            />
                                        }
                                        type = "input"
                                        labelPosition="right"
                                        placeholder="Add recipient address"
                                        value={this.state.recipientAddress}
                                        onChange={event => 
                                            this.setState({
                                                recipientAddress: event.target.value,
                                        })}
                                    style={{width:'300px', height:"40px"}}
                                    />
                                </Form.Field>
                            </Grid.Column>
                        </Grid.Row>

                        <Grid.Row verticalalign='middle'>
                            <Grid.Column>
                                <Form.Field>
                                    <Input 
                                    type = "input"
                                    placeholder="Add value"
                                    value={this.state.value}
                                    onChange={event => 
                                        this.setState({
                                            value: event.target.value,
                                    })}
                                    style={{width:'300px', height:"40px"}}
                                    />
                                </Form.Field>
                            </Grid.Column>
                        </Grid.Row>   

                        <Grid.Row verticalalign='middle'>
                            <Grid.Column> 
                                <Form onSubmit={this.onSubmit}>
                                    <Form.Field>
                                        <Button 
                                            color="black"
                                            bsStyle="primary" 
                                            type="submit"
                                            loading={this.state.sendLoanding}> 
                                            Send Token!
                                        </Button>
                                    </Form.Field>
                                </Form>
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                </Segment>

                <Segment style={{marginTop:'30px'}}>
                    <Grid stackable textAlign='center' style={{margin:"20px"}}>
                        <Grid.Row verticalalign='middle'>
                            <Grid.Column>
                                <Message>
                                    <Message.Header>Deposit Section</Message.Header>
                                    Deposit crypto token in biconomy account address for perform transfer crypto via gasless or meta-transaction.
                                </Message>
                            </Grid.Column>
                        </Grid.Row>
                        <Grid.Row verticalalign='middle'>
                            <Grid.Column>
                                <Form.Field>
                                    <Input
                                        label={
                                            <Dropdown
                                                options={collateralOptions}
                                                value={this.state.collateralTokenSymbol} 
                                                onChange={this.handleChangeCollateralTokenSymbol} 
                                            />
                                        }
                                        type = "input"
                                        labelPosition="right"
                                        placeholder="Add value"
                                        value={this.state.collateralValue}
                                        onChange={event => 
                                            this.setState({
                                                collateralValue: event.target.value,
                                        })}
                                    style={{width:'300px', height:"40px"}}
                                    />
                                </Form.Field>
                            </Grid.Column>
                        </Grid.Row>   

                        <Grid.Row verticalalign='middle'>
                            <Grid.Column> 
                                <Form onSubmit={this.onAddCollateral}>
                                    <Form.Field>
                                        <Button 
                                            color="black"
                                            bsStyle="primary" 
                                            type="submit"
                                            loading={this.state.collateralUploadLoading}> 
                                            Deposit Crypto for meta transaction
                                        </Button>
                                    </Form.Field>
                                </Form>
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                </Segment>

                    <Grid stackable style={{margin:"20px"}}>
                        <Grid.Row verticalalign='middle'>
                            <Grid.Column>
                                <Message>
                                    <Message.Header>Instructions</Message.Header>
                                    <List as="ol">
                                        <List.Item as="li" value='*'>Before any other transactions you need to perform biconomy login first.</List.Item>
                                        <List.Item as="li" value='*'>For DAI meta transaction you need to first permit to wallet.</List.Item>
                                        <List.Item as="li" value='*'>Other than DAI for any other crypto, you need to deposit that crypto in biconomy account address in deposit section then you can go to transfer section and can transfer fund via meta transaction.</List.Item>
                                        <List.Item as="li" value='*'>This DAPP is currently for KOVAN network</List.Item>
                                    </List>
                                </Message>
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                </Container>
            </Layout>
        );
    }
}

export default Index; 