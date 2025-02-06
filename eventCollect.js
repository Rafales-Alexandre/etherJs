import { ethers } from 'ethers';
import dotenv from 'dotenv';
import inquirer from 'inquirer';

dotenv.config();

const providerUrl = process.env.Api_Key_Main;
if (!providerUrl) {
  console.error("Erreur : Api_Key_Main n'est pas défini dans le fichier .env");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(providerUrl);
const daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const daiAbi = [
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];
const daiContract = new ethers.Contract(daiAddress, daiAbi, provider);

async function collectEvents(eventName, fromBlock, toBlock) {
  let allEvents = [];
  const chunkSize = 2000;
  for (let start = fromBlock; start <= toBlock; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, toBlock);
    console.log(`Interrogation des blocs ${start} à ${end}...`);
    try {
      const events = await daiContract.queryFilter(eventName, start, end);
      console.log(`--> ${events.length} événement(s) trouvé(s) dans cette tranche.`);
      allEvents = allEvents.concat(events);
    } catch (error) {
      console.error(`Erreur entre ${start} et ${end} :`, error);
    }
  }
  return allEvents;
}

async function main() {
  const answers = await inquirer.prompt([
    {
      type: 'number',
      name: 'fromBlock',
      message: 'Saisis le numéro du bloc de début:',
      validate: (input) => (input >= 0 ? true : "Le numéro du bloc doit être positif")
    },
    {
      type: 'number',
      name: 'toBlock',
      message: 'Saisis le numéro du bloc de fin:',
      validate: (input) => (input >= 0 ? true : "Le numéro du bloc doit être positif")
    }
  ]);

  const fromBlock = answers.fromBlock;
  const toBlock = answers.toBlock;
  console.log(`Collecte des événements Transfer pour DAI entre le bloc ${fromBlock} et ${toBlock}`);

  try {
    const events = await collectEvents("Transfer", fromBlock, toBlock);
    console.log(`\nTotal : ${events.length} événement(s) Transfer trouvé(s).\n`);
    events.forEach((event, index) => {
      console.log(`--- Événement ${index + 1} ---`);
      console.log(`Transaction Hash : ${event.transactionHash}`);
      console.log(`Block Number     : ${event.blockNumber}`);
      console.log(`From             : ${event.args.from}`);
      console.log(`To               : ${event.args.to}`);
      console.log(`Value            : ${ethers.formatUnits(event.args.value, 18)} DAI`);
      console.log('------------------------------\n');
    });
  } catch (error) {
    console.error('Erreur lors de la collecte des événements :', error);
  }
}

main().catch((error) => {
  console.error('Erreur inattendue :', error);
  process.exit(1);
});
