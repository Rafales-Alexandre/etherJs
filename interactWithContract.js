import { ethers } from 'ethers';
import dotenv from 'dotenv';
import inquirer from 'inquirer';

dotenv.config();

const url = 'https://eth-sepolia.g.alchemy.com/v2/_0wJbZCnKGUqnW41jg6H49L50hAEGlzz';
const provider = new ethers.JsonRpcProvider(url);
const privateKey = process.env.Private_Key;

if (!privateKey) {
    console.error('Erreur : clé privée manquante dans le fichier .env');
    process.exit(1);
}

const signer = new ethers.Wallet(privateKey, provider);
const contractAddress = '0xD325B95C679e450E39Cf178fF27b6ee1eE36266C';

const contractABI = [
    {
        "inputs": [{ "internalType": "string", "name": "name_", "type": "string" },
                   { "internalType": "string", "name": "symbol_", "type": "string" }],
        "stateMutability": "nonpayable", "type": "constructor"
    },
    {
        "inputs": [{ "internalType": "address", "name": "to", "type": "address" },
                   { "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "mint", "outputs": [], "stateMutability": "nonpayable", "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "from", "type": "address" },
                   { "internalType": "address", "name": "to", "type": "address" },
                   { "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "transferFrom", "outputs": [], "stateMutability": "payable", "type": "function"
    },
    {
        "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view", "type": "function"
    },
    {
        "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view", "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
        "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view", "type": "function"
    }
];

const contract = new ethers.Contract(contractAddress, contractABI, signer);

async function mintToken() {
    const { to, tokenId } = await inquirer.prompt([
        { type: 'input', name: 'to', message: 'Adresse du destinataire :' },
        { type: 'number', name: 'tokenId', message: 'ID du token :' }
    ]);

    try {
        const tx = await contract.mint(to, tokenId);
        await tx.wait();
        console.log(`✅ Token ${tokenId} minté pour ${to}`);
    } catch (error) {
        console.error('❌ Erreur lors du minting :', error);
    }
}

async function transferToken() {
    const { to, tokenId } = await inquirer.prompt([
        { type: 'input', name: 'to', message: 'Adresse du destinataire :' },
        { type: 'number', name: 'tokenId', message: 'ID du token :' }
    ]);

    try {
        const tx = await contract.transferFrom(signer.address, to, tokenId);
        await tx.wait();
        console.log(`✅ Token ${tokenId} transféré à ${to}`);
    } catch (error) {
        console.error('❌ Erreur lors du transfert :', error);
    }
}

async function consulterContrat() {
    try {
        const name = await contract.name();
        const symbol = await contract.symbol();
        console.log(`📜 Nom du contrat : ${name}`);
        console.log(`🔷 Symbole : ${symbol}`);

        const balance = await contract.balanceOf(signer.address);
        console.log(`💰 Votre balance : ${balance}`);
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des infos :', error);
    }
}

async function menu() {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Que souhaitez-vous faire ?',
            choices: [
                { name: 'Mint un Token', value: 'mint' },
                { name: 'Transférer un Token', value: 'transfer' },
                { name: 'Consulter le contrat', value: 'consult' },
                { name: 'Quitter', value: 'quit' }
            ]
        }
    ]);

    switch (action) {
        case 'mint':
            await mintToken();
            break;
        case 'transfer':
            await transferToken();
            break;
        case 'consult':
            await consulterContrat();
            break;
        case 'quit':
            console.log('👋 Fin du script');
            process.exit(0);
    }

    await menu();
}

menu();
