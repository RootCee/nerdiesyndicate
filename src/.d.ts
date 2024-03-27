// contractABI.d.ts
declare module './contractABI' {
    const abi: any;
    export default abi;
  }
  
  declare global {
    interface Window {
      ethereum: any;
    }
  }