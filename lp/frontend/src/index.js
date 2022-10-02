import { ethers } from "ethers"
import SpaceRouterJSON from '../../artifacts/contracts/SpaceRouter.sol/SpaceRouter.json';
import SpaceLPJSON from '../../artifacts/contracts/SpaceLP.sol/SpaceLP.json';
import IcoJSON from '../../artifacts/contracts/Ico.sol/ICO.json';
import SpaceCoinJSON from '../../artifacts/contracts/SpaceCoin.sol/SpaceCoin.json';


const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

const icoAddr = '0x08654c2630482ba778d19416664D2273191CA7E2'
const spaceCoinAddr = '0x5E78CE071B6a199C6253EA7FB6Eb90A308c5483c'
const spaceLPAddr = '0xF526dE308F75Fe633Aa1be67E691a73DEb98460d'
const spaceRouterAddr = '0x27BDaBa8fb7DFf3d9051643Dfe468a9F7c95eE28'

const icoContract = new ethers.Contract(icoAddr, IcoJSON.abi, provider);
const spaceCoinContract = new ethers.Contract(spaceCoinAddr, SpaceCoinJSON.abi, provider);
const spaceLPContract = new ethers.Contract(spaceLPAddr, SpaceLPJSON.abi, provider);
const spaceRouterContract = new ethers.Contract(spaceRouterAddr, SpaceRouterJSON.abi, provider);

async function connectToMetamask() {
  try {
    console.log("Signed in as", await signer.getAddress())
  }
  catch(err) {
    console.log("Not signed in")
    await provider.send("eth_requestAccounts", [])
  }
}



//
// ICO
//
ico_spc_buy.addEventListener('submit', async e => {
  e.preventDefault()
  const form = e.target
  const eth = ethers.utils.parseEther(form.eth.value)
  console.log("Buying", eth, "eth")

  await connectToMetamask()
  try {
    const unconfirmedTx = await icoContract.connect(signer).contribute({value: eth})
    await unconfirmedTx.wait();
    ico_spc_left.innerHTML = ethers.utils.formatEther(ethers.utils.parseEther("150000").sub(BigNumber.from(await icoContract.currentTotalContribution()).mul(5))) 
    ico_error.innerHTML = "";
  } catch (err) {
    ico_error.innerHTML = err.reason;
  }
})


//
// LP
//
let currentSpcToEthPrice = 5

provider.on("block", async n => {
  console.log("New block", n)
  try {

    let currentSpcInPool = await spaceLPContract.spcTokenBalance();
    let currentEthInPool = await spaceLPContract.ethBalance();
    currentSpcToEthPrice = currentEthInPool > 0 ? currentSpcInPool/currentEthInPool : 0;

  } catch(err) {
    ico_error.innerHTML = err.reason;
  }
})

console.log("currentSpcToEthPrice", currentSpcToEthPrice)

lp_deposit.eth.addEventListener('input', e => {
  lp_deposit.spc.value = +e.target.value * currentSpcToEthPrice
})

lp_deposit.spc.addEventListener('input', e => {
  lp_deposit.eth.value = +e.target.value / currentSpcToEthPrice
})

lp_deposit.addEventListener('submit', async e => {
  e.preventDefault()
  const form = e.target
  const eth = ethers.utils.parseEther(form.eth.value)
  const spc = ethers.utils.parseEther(form.spc.value)
  console.log("Depositing", eth, "eth and", spc, "spc")

  await connectToMetamask()

  try {
    const unconfirmedTx1 = await spaceCoinContract.connect(signer).approve(spaceRouterAddr, spc);
    await unconfirmedTx1.wait();
    const unconfirmedTx2 = await spaceRouterContract.connect(signer).addLiquidity(spc, {value: eth});
    await unconfirmedTx2.wait();
  } catch (err) {
    lp_deposit_error.innerHTML = err.reason;
  }

})

lp_withdraw.addEventListener('submit', async e => {
  e.preventDefault()
  console.log("Withdrawing 100% of LP")

  await connectToMetamask()
  try {
    const lpToken = await spaceLPContract.connect(signer).balanceOf(await signer.getAddress());
    const unconfirmedTx = await spaceLPContract.connect(signer).increaseAllowance(spaceRouterAddr, ethers.utils.parseEther("10000000"));
    unconfirmedTx.wait()
    const unconfirmedTx1 = await spaceRouterContract.connect(signer).removeLiquidity(lpToken);
    await unconfirmedTx1.wait();
  } catch (err) {
    lp_withdraw_error.innerHTML = err.reason;
  }
})

//
// Swap
//
let swapIn = { type: 'eth', value: 0 }
let swapOut = { type: 'spc', value: 0 }
switcher.addEventListener('click', () => {
  [swapIn, swapOut] = [swapOut, swapIn]
  swap_in_label.innerText = swapIn.type.toUpperCase()
  swap.amount_in.value = swapIn.value
  updateSwapOutLabel()
})

swap.amount_in.addEventListener('input', updateSwapOutLabel)

function updateSwapOutLabel() {
  swapOut.value = swapIn.type === 'eth'
    ? +swap.amount_in.value * currentSpcToEthPrice
    : +swap.amount_in.value / currentSpcToEthPrice

  swap_out_label.innerText = `${swapOut.value} ${swapOut.type.toUpperCase()}`
}

swap.addEventListener('submit', async e => {
  e.preventDefault()
  const form = e.target
  const amountIn = ethers.utils.parseEther(form.amount_in.value)

  const maxSlippage = form.max_slippage.value
  console.log("max slippage value:", maxSlippage)

  console.log("Swapping", ethers.utils.formatEther(amountIn), swapIn.type, "for", swapOut.type)

  await connectToMetamask()
  try {

    if (swapIn.type == 'eth') {
      const expectedSpcToReceive = await spaceLPContract.quoteSwapPrice(amountIn, 0);
      const slippageAdjusted = expectedSpcToReceive - (expectedSpcToReceive * maxSlippage)/100;
      const unconfirmedTx1 = await spaceRouterContract.connect(signer).swapETHForSPC(slippageAdjusted, {value: amountIn});
    await unconfirmedTx1.wait();
    } else {

      const unconfirmedTx1 = await spaceCoinContract.connect(signer).approve(spaceRouterAddr, amountIn);
      await unconfirmedTx1.wait();

      const expectedEthToReceive = await spaceLPContract.quoteSwapPrice(0, amountIn);
      const slippageAdjusted = expectedEthToReceive - (expectedEthToReceive * maxSlippage)/100;
      const unconfirmedTx2 = await spaceRouterContract.connect(signer).swapSPCForETH(amountIn, slippageAdjusted);
      await unconfirmedTx2.wait();
    }

  } catch(err) {
    swap_error.innerHTML = err.reason;
    console.log(err)

  }
})
