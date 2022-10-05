# Multisig Project

## Deliverables

My Gnosis Safe can be found here: `https://gnosis-safe.io/app/gor:0x1B705ac8177539Fd46f35B47767e6D846690D056/`

Contracts have been deployed to Goerli at the following addresses:

| Contract | Address Etherscan Link | Transaction Etherscan Link |
| -------- | ------- | --------- |
| Multisig | `https://goerli.etherscan.io/address/0x1B705ac8177539Fd46f35B47767e6D846690D056` | `https://goerli.etherscan.io/tx/0xd3ef39c1f38074fbef495c52faf009527e31019e5db101d4d800d3df21bca800` |
| Proxy | `https://goerli.etherscan.io/address/0xC5F2Cb6037c3A6A5f007eC1E0FE3a9D63f8d05A4` | `https://goerli.etherscan.io/tx/0x23e3b8f8ec1762c8fe2d069599e1b4af78c0093179a1a13005035e13ab4faeb9`|
| Logic | `https://goerli.etherscan.io/address/0xD3De4dc60C69e63B7e0D81A451b8bf048eC426aa` | `https://goerli.etherscan.io/tx/0xd6b254a262e25d93e6c2eb4a49dba93e0b14b655d69836e5ceeca7b29e55a800` |
| LogicImproved | `https://goerli.etherscan.io/address/0x8f0E4B077b523a0fC42d1Ee5004d8f0a82B93065` | `https://goerli.etherscan.io/tx/0x4ac512fb6c2aac718b0d63549b3449d7cc9fec4ab4675862e4ab51e921df5a1e` |

Transaction for transferring the ownership of the **Proxy** contract to the multisig:

| Contract | Transaction Etherscan Link |
| -------- | -- |
| Proxy | `https://goerli.etherscan.io/tx/0x9b55baeea0b9a387a56a7cda2e8edbbfd16f9dee86e481ffb05e581ff3abd05f` |

Transaction calling `upgrade(address)` to upgrade the **Proxy** from **Logic** -> **LogicImproved**
| Contract | Function called | Transaction Etherscan Link |
| --------------- | --------------- | -- |
| Proxy | `upgrade` | `https://goerli.etherscan.io/tx/0xa8254eeef97762424e3c34d2ec93c5a5063c2f9e3a1fcf2e8ec112f509806447` |

# Design exercise

> Consider and write down the positive and negative tradeoffs of the following configurations for a multisig wallet. In particular, consider how each configuration handles the common failure modes of wallet security.

> - 1-of-N
> - M-of-N (where M: such that 1 < M < N)
> - N-of-N

## 1-of-N

### Advantages

* Easy to process transaction, no need to wait for others.
* Can be considered as a shared wallet among multiple users.

### Disadvantages

* All owners need to be trusted. If single of them behaves maliciously, it will be bad for all.
* No other owner can verify the transaction. Can be single point of failure.

### M-of-N (where M: such that 1 < M < N)

### Advantages

* No single person can take decision.
* If single key is compromised, they can be recovered.

### Disadvantages

* Need to wait for other owners to sign the transactions.

### N-of-N

### Advantages

* Too much secure. All needs to take decision collectively.
* Even if single person disagrees, decision won't be taken place.

### Disadvantages

* If single entity lost the keys, whole wallet is not functional.
* Need to wait for everyone to sign the transaction.
