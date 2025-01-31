import { ethers } from 'ethers';
import dotenv from 'dotenv';
import inquirer from 'inquirer';

dotenv.config();

// 🔗 Configuration du provider Ethereum
const url = 'https://eth-sepolia.g.alchemy.com/v2/_0wJbZCnKGUqnW41jg6H49L50hAEGlzz';
const provider = new ethers.JsonRpcProvider(url);

// 🔑 Chargement de la clé privée
const privateKey = process.env.Private_Key;
if (!privateKey) {
    console.error('❌ Erreur : Clé privée manquante dans .env');
    process.exit(1);
}
const signer = new ethers.Wallet(privateKey, provider);

// 🏦 Adresse cible et montant
const recipientAddress = '0xCb0214aDD202a410d1d8C6F8fd2233676adBE9dA';
const amountOfEther = ethers.parseUnits('0.001', 'ether');

// 📌 Vérifier l'état d'une transaction
async function checkTransactionStatus(txHash) {
    const tx = await provider.getTransaction(txHash);
    
    if (!tx) {
        console.log("⚠️ Transaction introuvable ! Elle pourrait avoir été remplacée ou rejetée.");
        return;
    }

    console.log(`📜 Statut de la transaction :`);
    console.log(`🔗 Hash: ${tx.hash}`);
    console.log(`🔢 Block Number: ${tx.blockNumber || 'En attente...'}`);

    if (tx.blockNumber) {
        console.log("✅ La transaction a bien été minée !");
    } else {
        console.log("⏳ La transaction est toujours en attente...");
    }
}

async function sendLegacyTransaction() {
    const nonce = await signer.getNonce();
    console.log(`🔢 Nonce actuel : ${nonce}`);

    try {
        const tx = await signer.sendTransaction({
            to: recipientAddress,
            value: amountOfEther,
            gasLimit: 21000,
            gasPrice: ethers.parseUnits('10', 'gwei'),
            nonce,
            type: 0
        });
        await tx.wait();
        console.log(`✅ Type 0 Transaction Hash: https://sepolia.etherscan.io/tx/${tx.hash}`);
        await checkTransactionStatus(tx.hash);
    } catch (error) {
        console.error('❌ Erreur lors de la transaction de type 0 :', error.message);
    }
}

async function sendEIP1559Transaction() {
    const nonce = await signer.getNonce();

    try {
        const tx = await signer.sendTransaction({
            to: recipientAddress,
            value: amountOfEther,
            gasLimit: 21000,
            maxFeePerGas: ethers.parseUnits('20', 'gwei'),
            maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),
            nonce,
            type: 2
        });
        await tx.wait();
        console.log(`✅ Type 2 Transaction Hash: https://sepolia.etherscan.io/tx/${tx.hash}`);
        await checkTransactionStatus(tx.hash);
    } catch (error) {
        console.error('❌ Erreur lors de la transaction de type 2 :', error.message);
    }
}

async function sendHighGasTransaction() {
    const feeData = await provider.getFeeData();
    console.log('📊 Fee Data:', feeData);

    try {
        const tx = await signer.sendTransaction({
            to: recipientAddress,
            value: amountOfEther,
            type: 0, 
            gasPrice: ethers.parseUnits('100', 'gwei'), 
        });
        console.log(`🚀 Transaction envoyée avec priorité: https://sepolia.etherscan.io/tx/${tx.hash}`);
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmée dans le bloc:', receipt.blockNumber);
    } catch (error) {
        console.error('❌ Erreur lors de l’envoi avec gas élevé:', error.message);
    }
}

async function sendLowGasLimitTransaction() {
    try {
        const estimate = await signer.estimateGas({
            to: recipientAddress,
            value: amountOfEther,
        });

        console.log('🔍 Estimation du gas:', estimate.toString());

        const tx = await signer.sendTransaction({
            to: recipientAddress,
            value: amountOfEther,
            gasLimit: estimate / 2n, 
        });
        console.log(`⚠️ Transaction avec gas limit bas envoyée: https://sepolia.etherscan.io/tx/${tx.hash}`);
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmée:', receipt.blockNumber);
    } catch (error) {
        console.error('❌ Erreur: Transaction échouée par manque de gas', error.message);
    }
}

async function sendIncreasingGasTransactions() {
    let nonce = await signer.getNonce();
    let balance = await signer.provider.getBalance(signer.address);

    try {
        for (let i = 0; i < 5; i++) {
            const gasPrice = ethers.parseUnits((10 + i * 5).toString(), 'gwei');
            const gasLimit = 21000n;
            const gasCost = gasLimit * gasPrice;
            const transferableValue = balance - gasCost;

            if (transferableValue <= 0n) {
                console.log('⚠️ Fonds insuffisants pour continuer.');
                break;
            }

            const tx = await signer.sendTransaction({
                to: recipientAddress,
                value: transferableValue,
                gasLimit: Number(gasLimit),
                gasPrice,
                nonce
            });

            console.log(`🚀 Transaction avec gasPrice ${gasPrice} : https://sepolia.etherscan.io/tx/${tx.hash}`);
            await tx.wait();

            balance = await signer.provider.getBalance(signer.address);
            nonce++;
        }
        console.log('✅ Transactions terminées avec succès.');
    } catch (error) {
        console.error('❌ Erreur lors des transactions :', error.message);
    }
}
async function estimateGasCost() {
    try {
        console.log('🛠️ Estimation du coût en gas...');

        const gasEstimate = await signer.estimateGas({
            to: recipientAddress,
            value: amountOfEther
        });

        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice; // En wei

        const totalCostWei = gasEstimate * gasPrice; // Coût total en wei
        const totalCostEth = ethers.formatUnits(totalCostWei, 'ether'); // Conversion en ETH
        const totalCostGwei = ethers.formatUnits(totalCostWei, 'gwei'); // Conversion en Gwei

        console.log(`🔍 Gas Limit Estimé : ${gasEstimate}`);
        console.log(`⛽ Gas Price Actuel : ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
        console.log(`💰 Coût Total Estimé : ${totalCostEth} ETH (${totalCostGwei} Gwei)`);

        return { gasEstimate, totalCostEth, totalCostGwei };
    } catch (error) {
        console.error('❌ Erreur lors de l\'estimation du coût en gas :', error.message);
    }
}
async function main() {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Quelle transaction voulez-vous effectuer ?',
            choices: [
                { name: 'Type 0 (Legacy Transaction)', value: 'legacy' },
                { name: 'Type 2 (EIP-1559 Transaction)', value: 'eip1559' },
                { name: 'Transaction avec Gas élevé', value: 'highGas' },
                { name: 'Transaction avec Gas Limit bas', value: 'lowGasLimit' },
                { name: 'Transactions avec gas croissant', value: 'gasIncrease' },
                { name: 'Vérifier une transaction', value: 'checkTx' },
                { name: 'Estimer le coût en gas', value: 'estimateGas' },
                { name: 'Quitter', value: 'quit' }
            ]
        }
    ]);

    switch (action) {
        case 'legacy':
            await sendLegacyTransaction();
            break;
        case 'eip1559':
            await sendEIP1559Transaction();
            break;
        case 'highGas':
            await sendHighGasTransaction();
            break;
        case 'lowGasLimit':
            await sendLowGasLimitTransaction();
            break;
        case 'gasIncrease':
            await sendIncreasingGasTransactions();
            break;
        case 'checkTx':
            const { txHash } = await inquirer.prompt([{ type: 'input', name: 'txHash', message: 'Entrez le hash de la transaction :' }]);
            await checkTransactionStatus(txHash);
            break;
        case 'estimateGas':
            await estimateGasCost();
            break;    
        case 'quit':
            console.log('👋 Fin du script.');
            process.exit(0);
    }

    await main();
}

// Lancer le script
main().catch(console.error);
