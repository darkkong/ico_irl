export default function ether(n) {
  return new web3.utils.toWei(web3.utils.toBN(n), "ether");
}
