# Solidity Portfolio
This repo contains Solidity smart contracts and tests developed during the Macro Smart Contract Security Fellowship. See below for summaries of each project. Check out each project's individual README.md for more info. Also included are security audits from Macro staff.

## crowdfund
A fundraising contract which provides ERC721 contributor badge NFTs to contributors that invest past a certain threshold. A project owner can deploy a fundraising contract through the factory contract with set fundraising goals and timelines. Investors are refunded their contributions if the fundraiser is unsuccessful or cancelled.

## ico
A multi-phase ERC20 token fundraiser which includes a whitelist-only private phase, a public general phase, and an open phase where tokens become claimable. The token is designed with an optional transfer tax. This project has been deployed to Rinkeby testnet, and also includes a custom barebones JS front-end.

## dao
An ownerless DAO contract with the purpose of acquiring NFTs with treasury funds. Members can submit proposals to purchase NFTs or execute arbitrary code. Votes can be made either on-chain or off-chain through gasless signature. No imports were used for this project. The spec was custom designed to incentivize behavior benefitting long-term success of the DAO.

## lp
A uniswap V2-style AMM core and router that allows liquidity provisioning and swaps through a constant curve formula. The contracts take special care to handle a token with internal transfer tax without unexpected slippage. The code is more readable than Uniswap's, and the core contract design prevents liquidity providers from unexpectedly donating additional funds to the pool if their provided liquidity ratio differs from the pool. This project has been deployed to Rinkeby testnet, and also includes a custom barebones JS front-end.

## multisig
An exercise to deploy and upgrade an OpenZeppelin Upgradeable Proxy/Logic contract using a Gnosis-safe managed multisig. Contract code was provided by Macro instruction team.

## merkledrop
A token airdrop contract which distributes airdrops either through an immutable Merkle tree set at contract deployment, or EIP-712 compliant signatures signed by the contract owner.
