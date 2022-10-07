Auditor: Morgan Weaver (@libertine#7337)

# Issues


**SpaceLP**

**[M-1]** Reentrancy in skim function  
  
State variable `spcTokenBalance = spaceCoin.balanceOf(address(this)) - spcToSend` occurs after ETH transfer external call.  Could put a lock modifier on it or remove the skim function.  I'm classifying this as medium rather than high because I'm not convinced that this reentrancy could destroy the contract, but Slither was certainly worried about it. Either way, there's an external call before effects and other code which gives an attacker a small yet significant opportunity exploit the contract in creative ways that I probably can't imagine here. 

You could remove the skim function, put a lock modifier on it, or add if/else logic described below.  

Alternatively, consider an if-else here to prevent an attacker exploiting the reentrancy opportunity, because they *shouldn't* be removing both SPC and ETH in the same function anyway.  Like this:
```
 function skim(address to) external {
        uint256 ethToSend = address(this).balance - ethBalance;
        ethBalance = address(this).balance - ethToSend;
        if (ethToSend > 0) {
            (bool success, ) = to.call{value: ethToSend}("");
            require(success, "external call failed");
        } else {
            //don't put this above external call, otherwise there can be reentrancy attacks
            uint256 spcToSend = spaceCoin.balanceOf(address(this)) -
                spcTokenBalance;
            spcTokenBalance = spaceCoin.balanceOf(address(this)) - spcToSend;
            if (spcToSend > 0) {
                spaceCoin.transfer(to, spcToSend);
            }
        }
    }
```

**[L-1]** Skim function not in spec, increases attack surface, though an interesting innovation  
  
In class Melville had mentioned that market forces would naturally set the ratio here within the constraints of the constant product formula, so if the price of SPC went up or down and was no longer 5:1, that would just be a reflection of the market.  The skim function is interesting, but you're still giving away free tokens to bots which I think decreases the withdrawl returns to LPs and invites bots to randomly suck liquidity out of the pool, even if it's with a purpose, while increasing attack surface of the contract.  I see the security argument here--like if SPC or ETH is force sent to the contract, this skim function can balance it back out--but I'm not convinced this is the best way to handle it. Just my take.


**[Q-1]** Consider using the most up to date `if(condition) revert Error()` pattern for error handling  

This saves a little gas and is considered current Solidity best practice. 

**[Q-2]** quoteSwapPrice can be written in a currency-agnostic manner to save gas since the reserve values are public and can be passed in by any caller  
  
```
quoteSwapPrice(ethOrSpcIn, toeknReserveIn, tokenReserveOut) public pure returns (uint256) {
        if (ethOrSpcIn == 0) {
            require(false, "no assets sent");
        }
        require(totalSupply() > 0, "no liquidity");
        uint inputMinusFee = ethOrSpcIn - (ethOrSpcIn) / 100;
        uint num = inputMinusFee * tokenReserveOut;
        uint denom = (tokenReserveIn + inputMinusFee);
        return (num / denom);
    }
```

**[Q-3]** Simple spot price function without price impact is missing  
  
https://discord.com/channels/870313767873962014/1022930243230650438/1026505160631009340

**[Q-4]** Consider adding events for critical functions like mint, withdraw, skim and swap  

This will make the dApp easier to maintain and monitor, and help client code verify functionality amongst other nice-to-have assurances.


**SpaceRouter**

**[Q-1]** Consider using the most up to date `if(condition) revert Error()` pattern for error handling  



 