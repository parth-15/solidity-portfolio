import { BigNumber, ethers } from "ethers"
import IcoJSON from '../../artifacts/contracts/Ico.sol/Ico.json';
import SpaceCoinJSON from '../../artifacts/contracts/SpaceCoin.sol/SpaceCoin.json';

const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

const icoAddr = '0xc8FE4daE6b7dcB33F1302891DfaB66Fa2f3cA9f3';
const icoContract = new ethers.Contract(icoAddr, IcoJSON.abi, provider);

const spaceCoinAddr = '0x35f0DeC22F941213ADEc52a55Cccb0dded04Ec0F';
const spaceCoinContract = new ethers.Contract(spaceCoinAddr, SpaceCoinJSON.abi, provider);

async function connectToMetamask() {
  try {
    console.log("Signed in as", await signer.getAddress())
  }
  catch(err) {
    console.log("Not signed in")
    await provider.send("eth_requestAccounts", [])
  }
}

connectToMetamask();


ico_spc_buy.addEventListener('submit', async e => {
  e.preventDefault()
  const form = e.target
  const eth = ethers.utils.parseEther(form.eth.value)
  console.log("buying", eth)
  await connectToMetamask()

  try {
    const unconfirmedTx = await icoContract.connect(signer).contribute({value: eth})
    await unconfirmedTx.wait();
    ico_spc_left.innerHTML = ethers.utils.formatEther(ethers.utils.parseEther("150000").sub(BigNumber.from(await icoContract.currentTotalContribution()).mul(5))) 
    ico_spc_earned.innerHTML = ethers.utils.formatEther((BigNumber.from(await icoContract.contributions(await signer.getAddress())).mul(5)).sub(await icoContract.tokenReedemed(await signer.getAddress())))
  } catch (err) {
    ico_error.innerHTML = err.message;
  }
})
