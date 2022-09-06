import { ethers } from "ethers"
// import IcoJSON from '../../artifacts/contracts/Ico.sol/Ico.json';
// import SpaceCoinJSON from '../../artifacts/contracts/SpaceCoin.sol/SpaceCoin.json';

const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

// const icoAddr = '0xb0385916a6422ba9058A77C4CdE228E5b322EC35';
// const icoContract = new ethers.Contract(icoAddr, IcoJSON.abi, provider);

// const spaceCoinAddr = '0x123b31a295a7eE3b6b49f193f2543eC5405813D6';
// const spaceCoinContract = new ethers.Contract(spaceCoinAddr, SpaceCoinJSON.abi, provider);

async function connectToMetamask() {
  try {
    console.log("Signed in as", await signer.getAddress())
  }
  catch(err) {
    console.log("Not signed in")
    await provider.send("eth_requestAccounts", [])
  }
}


ico_spc_buy.addEventListener('submit', async e => {
  e.preventDefault()
  const form = e.target
  const eth = ethers.utils.parseEther(form.eth.value)
  console.log("Buying", eth, "eth")

  await connectToMetamask()
  // TODO: Call icoContract.contribute function (very similar to your test code!)

  // TODO: update the displayed amount of SPC that is left to be claimed
  ico_spc_left.innerHTML = "42" // TODO: this is not the correct value, update it!
  ico_spc_earned.innerHTML = "42" // TODO: this is not the correct value, update it!

  // TODO: update the ico_error HTML element if an error occurs
})
