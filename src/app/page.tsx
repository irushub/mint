'use client';

import styles from './page.module.css'
import CustomProgressBar from './progressbar';
import SecondPage from './secondpage';


import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from "react";

import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { LedgerWalletAdapter, SolflareWalletAdapter} from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { base58PublicKey,
  generateSigner,
  Option,
  PublicKey,
  publicKey,
  signAllTransactions,
  SolAmount,
  some,
  transactionBuilder,
  transactionBuilderGroup,
  Umi,
  unwrapSome
} from "@metaplex-foundation/umi";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { setComputeUnitLimit } from '@metaplex-foundation/mpl-essentials';
import { InsufficientTokenBalanceError, mplTokenMetadata, TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import { mplCandyMachine, 
  fetchCandyMachine, 
  mintV2, 
  safeFetchCandyGuard, 
  DefaultGuardSetMintArgs, 
  DefaultGuardSet, 
  SolPayment, 
  CandyMachine, 
  CandyGuard } from "@metaplex-foundation/mpl-candy-machine";
import { Keypair, Signer, Transaction } from '@solana/web3.js';
import { error } from 'console';
import { Fahkwang } from 'next/font/google';

export default function Home() {

  // const network = process.env.NEXT_PUBLIC_NETWORK === 'devnet' ? WalletAdapterNetwork.Devnet :
  //   process.env.NEXT_PUBLIC_NETWORK === 'testnet' ? WalletAdapterNetwork.Testnet :
  //   WalletAdapterNetwork.Mainnet;
  const network = WalletAdapterNetwork.Mainnet;

  // const endpoint = `https://${process.env.NEXT_PUBLIC_RPC_URL}`;
  const endpoint = "https://mainnet.helius-rpc.com/?api-key=5bd6702f-4c9a-4ba7-a929-4ef0ca0947fb";

  const wallets = useMemo(
    () => [
      new LedgerWalletAdapter(),
      new SolflareWalletAdapter({ network }),
    ],
    [network]
  );

  const WalletMultiButtonDynamic = dynamic(
    async () =>
      (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
    { ssr: false }
  );

  // set up umi
  let umi: Umi = createUmi(endpoint)
    .use(mplTokenMetadata())
    .use(mplCandyMachine());

  // state
  const [loading, setLoading] = useState(false);
  const [mintCreated, setMintCreated] = useState<PublicKey | null>(null);
  const [minted1,setMinted1] = useState(false);
  const [minted5,setMinted5] = useState(false);
  const [minted10,setMinted10] = useState(false);
  const [minted20,setMinted20] = useState(false);
  const [errminted1,seterrMinted1] = useState(false);
  const [errminted5,seterrMinted5] = useState(false);
  const [errminted10,seterrMinted10] = useState(false);
  const [errminted20,seterrMinted20] = useState(false);
  const [mintMsg, setMintMsg] = useState<string>();
  const [costInSol, setCostInSol] = useState<number>(0);
  const [cmv3v2, setCandyMachine] = useState<CandyMachine>();
  const [defaultCandyGuardSet, setDefaultCandyGuardSet] = useState<CandyGuard<DefaultGuardSet>>();
  const [countTotal, setCountTotal] = useState<number>();
  const [countRemaining, setCountRemaining] = useState<number>(0);
  const [countMinted, setCountMinted] = useState<number>();
  const [mintDisabled1, setMintDisabled1] = useState<boolean>(true);
  const [mintDisabled5, setMintDisabled5] = useState<boolean>(true);
  const [mintDisabled10, setMintDisabled10] = useState<boolean>(true);
  const [mintDisabled20, setMintDisabled20] = useState<boolean>(true);
  const [guard,setGuard] = useState<PublicKey>(publicKey("2YRyhFst1WhWUE99DpdBr2SFsymaJ3kE8h8498ApRG5i"));
  const [toWallet,setToWallet] = useState<PublicKey>(publicKey("Cqtx5F5enxYU3Jg6XLcGxECT11VH9pXj3SeeEcN9Ayov"));
  const [balanceInsuff,setBalanceInsuff] = useState<boolean>(false);
  const [mintOver,setMintOver] = useState<boolean>(false);

  // retrieve item counts to determine availability and
  // from the solPayment, display cost on the Mint button
  const retrieveAvailability = async () => {
    const cmId = "Ds44EaBAu1sW9pgJ1jbd3Qts5ru8GY4TghUaajZtJS8q";
    if (!cmId) {
      setMintMsg("No candy machine ID found. Add environment variable.");
      return;
    }
    const candyMachine: CandyMachine = await fetchCandyMachine(umi, publicKey(cmId));
    setCandyMachine(candyMachine);

    // Get counts
    setCountTotal(candyMachine.itemsLoaded);
    setCountMinted(Number(candyMachine.itemsRedeemed));
    const remaining = candyMachine.itemsLoaded - Number(candyMachine.itemsRedeemed)
    setCountRemaining(remaining);
    
    // Get cost
    setCostInSol(0.05);

    if (remaining > 0) {
      setMintDisabled1(false);
      setMintDisabled5(false);
      setMintDisabled10(false);
      setMintDisabled20(false);
    }
    else{
        setMintOver(true);
    }
  };

  useEffect(() => {
    retrieveAvailability();
  }, [mintCreated]);

  
  // Inner Mint component to handle showing the Mint button,
  // and mint messages
  const Mint = () => {
    const wallet = useWallet();
    umi = umi.use(walletAdapterIdentity(wallet));
  
    if (!wallet.connected) {
      return (
        <>          
          <button className={styles.mintBtn} disabled={mintDisabled1 || loading}>
            MINT 1
          </button>
          
        </> 
      );
    }

    const mintBtnHandler = async () => {
        //mint notification to false
        setMinted1(false);
        setMinted5(false);
        setMinted10(false);
        setMinted20(false);

        //error mint notification to false
        seterrMinted1(false);
        seterrMinted5(false);
        seterrMinted10(false);
        seterrMinted20(false);

        
      //wallet balance check
      const balance: SolAmount = await umi.rpc.getBalance(umi.identity.publicKey);
      if (Number(balance.basisPoints) / 1000000000 < costInSol || countRemaining < 1) {
        setBalanceInsuff(true);
        return (
          <>          
            <button onClick={mintBtnHandler} className={styles.mintBtn} disabled={mintDisabled1 || loading}>
              MINT<br/>
            </button>
            
          </> 
        );
      }
      else{
        setBalanceInsuff(false)
      }
  
      if (!cmv3v2) {
        setMintMsg("There was an error fetching the candy machine. Try refreshing your browser window.");
        return;
      }
      setLoading(true);
      setMintMsg(undefined);
  
      try {
        const candyMachine = cmv3v2;
  
        const nftSigner = generateSigner(umi);
        
        const mintArgs: Partial<DefaultGuardSetMintArgs> = {};
  
        // solPayment has mintArgs
        mintArgs.solPayment = some({
            destination: toWallet
        });
        
        const tx = transactionBuilder()
          .add(setComputeUnitLimit(umi, { units: 600_000 }))
          .add(mintV2(umi, {
            candyMachine: candyMachine.publicKey,
            collectionMint: candyMachine.collectionMint, 
            collectionUpdateAuthority: candyMachine.authority, 
            nftMint: nftSigner,
            candyGuard: guard,
            mintArgs: mintArgs,
            tokenStandard: TokenStandard.ProgrammableNonFungible
          }))
  
        const { signature } = await tx.sendAndConfirm(umi, {
          confirm: { commitment: "finalized" }, send: {
            skipPreflight: true,
          },
        });

        setMinted1(true);
        setMintMsg("Mint was successful!");
  
      } catch (err: any) {
        console.error(err);
        setMintMsg(err.message);
        seterrMinted1(true)
      } finally {
        setLoading(false);
      }
    };

    return (
      <>          
        <button onClick={mintBtnHandler} className={styles.mintBtn} disabled={mintDisabled1 || loading}>
          MINT 1
        </button>
        
      </> 
    );
  };

  const Mint5 = () => {
    const wallet = useWallet();
    umi = umi.use(walletAdapterIdentity(wallet));
  
    if (!wallet.connected) {
      return (
        <>          
          <button className={styles.mintBtn} disabled={mintDisabled5 || loading}>
            MINT 5
          </button>
          
        </> 
      );
    }

    const mintBtnHandler5 = async () => {
        //error mint notification to false
        seterrMinted1(false);
        seterrMinted5(false);
        seterrMinted10(false);
        seterrMinted20(false);

        //mint notification to false
        setMinted1(false);
        setMinted5(false);
        setMinted10(false);
        setMinted20(false);

      //wallet balance check
      const balance: SolAmount = await umi.rpc.getBalance(umi.identity.publicKey);
      if (Number(balance.basisPoints) / 1000000000 < (costInSol*5) || countRemaining < 5) {
        setBalanceInsuff(true);
        return (
          <>          
            <button onClick={mintBtnHandler5} className={styles.mintBtn} disabled={mintDisabled5 || loading}>
              MINT 5<br/>
            </button>
            
          </> 
        );
      }
      else{
        setBalanceInsuff(false);
      }
  
      if (!cmv3v2) {
        setMintMsg("There was an error fetching the candy machine. Try refreshing your browser window.");
        return;
      }
      setLoading(true);
      setMintMsg(undefined);
  
      try {
        const candyMachine = cmv3v2;
        
        const mintArgs: Partial<DefaultGuardSetMintArgs> = {};
  
        // solPayment has mintArgs
        mintArgs.solPayment = some({
            destination: toWallet
        });
        
        

        let transactions = [];
        let nftsigners = [] as any[];

        for(let i = 0; i<5; i++){
          const nftSigner = generateSigner(umi);

          const tx = transactionBuilder()
          .add(setComputeUnitLimit(umi, { units: 600_000 }))
          .add(mintV2(umi, {
            candyMachine: candyMachine.publicKey,
            collectionMint: candyMachine.collectionMint, 
            collectionUpdateAuthority: candyMachine.authority, 
            nftMint: nftSigner,
            candyGuard: guard,
            mintArgs: mintArgs,
            tokenStandard: TokenStandard.ProgrammableNonFungible
          }))

          try{
            const transaction = await tx.buildWithLatestBlockhash(umi);
            transactions.push(transaction);
            nftsigners.push(nftSigner);
          }
          catch(error){
            console.log(error);
          }
        }

        const mySignedTransactions = await signAllTransactions(
          transactions.map((transaction, index) => ({
            transaction,
            signers: [umi.payer, nftsigners[index]],
          }))
        );

        for(const ta of mySignedTransactions){
            const signature = await umi.rpc.sendTransaction(ta);
            const confirmResult = await umi.rpc.confirmTransaction(signature, {
              strategy: { type: 'blockhash', ...(await umi.rpc.getLatestBlockhash()) }
            });

            console.log(ta);
            console.log(confirmResult);
          }


        setMinted5(true);
        setMintMsg("Mint was successful!");
  
      } catch (err: any) {
        console.error(err);
        setMintMsg(err.message);
        seterrMinted5(true)
      } finally {
        setLoading(false);
      }
    };

    return (
      <>          
        <button onClick={mintBtnHandler5} className={styles.mintBtn} disabled={mintDisabled5 || loading}>
          MINT 5
        </button>
      </> 
    );
  };

  const Mint10 = () => {
    const wallet = useWallet();
    umi = umi.use(walletAdapterIdentity(wallet));
  
    if (!wallet.connected) {
      return (
        <>          
          <button className={styles.mintBtn} disabled={mintDisabled10 || loading}>
            MINT 10 
          </button>
          
        </> 
      );
    }

    const mintBtnHandler10 = async () => {
        //mint notification to false
        setMinted1(false);
        setMinted5(false);
        setMinted10(false);
        setMinted20(false);

        //error mint notification to false
        seterrMinted1(false);
        seterrMinted5(false);
        seterrMinted10(false);
        seterrMinted20(false);

      
      //wallet balance check
      const balance: SolAmount = await umi.rpc.getBalance(umi.identity.publicKey);
      if (Number(balance.basisPoints) / 1000000000 < (costInSol*10) || countRemaining < 10) {
        setBalanceInsuff(true);
        return (
          <>          
            <button onClick={mintBtnHandler10} className={styles.mintBtn} disabled={mintDisabled1 || loading}>
              MINT 10<br/>
            </button>
            
          </> 
        );
      }
      else{
        setBalanceInsuff(false);
        
      }
  
      if (!cmv3v2) {
        setMintMsg("There was an error fetching the candy machine. Try refreshing your browser window.");
        return;
      }
      setLoading(true);
      setMintMsg(undefined);
  
      try {
        const candyMachine = cmv3v2;
        
        const mintArgs: Partial<DefaultGuardSetMintArgs> = {};
  
        // solPayment has mintArgs
        mintArgs.solPayment = some({
            destination: toWallet
        });

        let transactions = [];
        let nftsigners = [] as any[];

        for(let i = 0; i<10; i++){
          const nftSigner = generateSigner(umi);

          const tx = transactionBuilder()
          .add(setComputeUnitLimit(umi, { units: 600_000 }))
          .add(mintV2(umi, {
            candyMachine: candyMachine.publicKey,
            collectionMint: candyMachine.collectionMint, 
            collectionUpdateAuthority: candyMachine.authority, 
            nftMint: nftSigner,
            candyGuard: guard,
            mintArgs: mintArgs,
            tokenStandard: TokenStandard.ProgrammableNonFungible
          }))

          try{
            const transaction = await tx.buildWithLatestBlockhash(umi);
            transactions.push(transaction);
            nftsigners.push(nftSigner);
          }
          catch(error){
            console.log(error);
          }
        }

        const mySignedTransactions = await signAllTransactions(
          transactions.map((transaction, index) => ({
            transaction,
            signers: [umi.payer, nftsigners[index]],
          }))
        );

        for(const ta of mySignedTransactions){
            const signature = await umi.rpc.sendTransaction(ta);
            const confirmResult = await umi.rpc.confirmTransaction(signature, {
              strategy: { type: 'blockhash', ...(await umi.rpc.getLatestBlockhash()) }
            });

            console.log(ta);
            console.log(confirmResult);
          }


        setMinted10(true);
        setMintMsg("Mint was successful!");
  
      } catch (err: any) {
        console.error(err);
        setMintMsg(err.message);
        seterrMinted10(true)
      } finally {
        setLoading(false);
      }
    };

    return (
      <>          
        <button onClick={mintBtnHandler10} className={styles.mintBtn} disabled={mintDisabled10 || loading}>
          MINT 10<br/>
        </button>
      </> 
    );
  };

  const Mint20 = () => {
    const wallet = useWallet();
    umi = umi.use(walletAdapterIdentity(wallet));
  
    if (!wallet.connected) {
      return (
        <>          
          <button className={styles.mintBtn} disabled={mintDisabled20 || loading}>
            MINT 20 
          </button>
          
        </> 
      );
    }

    const mintBtnHandler20 = async () => {
        //mint notification to false
        setMinted1(false);
        setMinted5(false);
        setMinted10(false);
        setMinted20(false);

        //error mint notification to false
        seterrMinted1(false);
        seterrMinted5(false);
        seterrMinted10(false);
        seterrMinted20(false);


        console.log("errortop");
      //wallet balance check
      const balance: SolAmount = await umi.rpc.getBalance(umi.identity.publicKey);
      if (Number(balance.basisPoints) / 1000000000 < (costInSol*20) || countRemaining < 20) {
        setBalanceInsuff(true);
        
        return (
          <>          
            <button onClick={mintBtnHandler20} className={styles.mintBtn} disabled={mintDisabled1 || loading}>
              MINT 20<br/>
            </button>
            
          </> 
        );
      }
      else{
        setBalanceInsuff(false);

      }
      console.log("errordown");
  
      if (!cmv3v2) {
        setMintMsg("There was an error fetching the candy machine. Try refreshing your browser window.");
        return;
      }
      setLoading(true);
      setMintMsg(undefined);
  
      try {
        const candyMachine = cmv3v2;
        
        const mintArgs: Partial<DefaultGuardSetMintArgs> = {};
  
        // solPayment has mintArgs
        mintArgs.solPayment = some({
            destination: toWallet
        });

        let transactions = [];
        let nftsigners = [] as any[];

        for(let i = 0; i<20; i++){
          const nftSigner = generateSigner(umi);

          const tx = transactionBuilder()
          .add(setComputeUnitLimit(umi, { units: 600_000 }))
          .add(mintV2(umi, {
            candyMachine: candyMachine.publicKey,
            collectionMint: candyMachine.collectionMint, 
            collectionUpdateAuthority: candyMachine.authority, 
            nftMint: nftSigner,
            candyGuard: guard,
            mintArgs: mintArgs,
            tokenStandard: TokenStandard.ProgrammableNonFungible
          }))

          try{
            const transaction = await tx.buildWithLatestBlockhash(umi);
            transactions.push(transaction);
            nftsigners.push(nftSigner);
          }
          catch(error){
            console.log(error);
          }
        }

        const mySignedTransactions = await signAllTransactions(
          transactions.map((transaction, index) => ({
            transaction,
            signers: [umi.payer, nftsigners[index]],
          }))
        );

        for(const ta of mySignedTransactions){
            const signature = await umi.rpc.sendTransaction(ta);
            const confirmResult = await umi.rpc.confirmTransaction(signature, {
              strategy: { type: 'blockhash', ...(await umi.rpc.getLatestBlockhash()) }
            });

            console.log(ta);
            console.log(confirmResult);
          }


        setMinted20(true);
        setMintMsg("Mint was successful!");
  
      } catch (err: any) {
        console.error(err);
        setMintMsg(err.message);
        seterrMinted20(true);
      } finally {
        setLoading(false);
      }
    };
  

    return (
      <>          
        <button onClick={mintBtnHandler20} className={styles.mintBtn} disabled={mintDisabled20 || loading}>
          MINT 20<br/>
        </button>
      </> 
    );
  };

  return (
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <main className={styles.main}>
          <div className={styles.logoContainer}>
            <img src="logo.png" alt="your logo" className={styles.logo} />
          </div>
          <div className={styles.walletButtonContainer}>
            <WalletMultiButtonDynamic />
          </div>
  
          <div className={styles.centerBox}>
            <div className={styles.image}>
            <img src="nft.gif" alt="Your Image" />
            </div>
            <div className={styles.contentContainer}>
              <div className={styles.percentage}>Total minted {countMinted}/{countTotal}</div>
              <div className={styles.progressbar}>
                <CustomProgressBar totalValue={countMinted} />
              </div>
            </div>
            <div className={styles.buttonContainer}>
                <Mint />
                <Mint5 />
                <Mint10 />
                <Mint20 />
            </div>
            
          </div>
          {loading && (
            <div className={styles.confirmationBox}>
              <div className={styles.loadingtext}>Confirming the transaction</div>
              <img src="loader.gif" alt="Tick Icon" className={styles.loadIcon} /> 
            </div>
          )}
          {minted1 && (
              <div className={styles.confirmationBox}>
                <div className={styles.lodingtext}>Minting 1 successful</div>
                <img src="tickicon.gif" alt="Tick Icon" className={styles.tickIcon} />
              </div>
          )}
          {minted5 && (
              <div className={styles.confirmationBox}>
                <div className={styles.lodingtext}>Minting 5 successful</div>
                <img src="tickicon.gif" alt="Tick Icon" className={styles.tickIcon} />
              </div>
          )}
          {minted10 && (
              <div className={styles.confirmationBox}>
                <div className={styles.lodingtext}>Minting 10 successful</div>
                <img src="tickicon.gif" alt="Tick Icon" className={styles.tickIcon} />
              </div>
          )}
          {minted20 && (
              <div className={styles.confirmationBox}>
                <div className={styles.lodingtext}>Minting 20 successful</div>
                <img src="tickicon.gif" alt="Tick Icon" className={styles.tickIcon} />
              </div>
          )}
          {errminted1 && (
            <div className={styles.confirmationBox}>
            <div className={styles.lodingtext}>Minting unsuccessful</div>
            <img src="erroricon.gif" alt="Tick Icon" className={styles.tickIcon} />
          </div>
          )}
          {errminted5 && (
            <div className={styles.confirmationBox}>
            <div className={styles.lodingtext}>Minting unsuccessful</div>
            <img src="erroricon.gif" alt="Tick Icon" className={styles.tickIcon} />
          </div>
          )}
          {errminted10 && (
            <div className={styles.confirmationBox}>
            <div className={styles.lodingtext}>Minting unsuccessful</div>
            <img src="erroricon.gif" alt="Tick Icon" className={styles.tickIcon} />
          </div>
          )}
          {errminted20 && (
            <div className={styles.confirmationBox}>
            <div className={styles.lodingtext}>Minting unsuccessful</div>
            <img src="erroricon.gif" alt="Tick Icon" className={styles.tickIcon} />
          </div>
          )}
          {balanceInsuff && (
            <div className={styles.confirmationBox}>
            <div className={styles.lodingtext}>Insufficient Wallet Balance</div>
            <img src="erroricon.gif" alt="Tick Icon" className={styles.tickIcon} />
          </div>
          )}

          <section className={styles.sectionBox}>
            <div className={styles.bulletin}>
              <div className={styles.title}><h1>What is our Utility?</h1></div>
              <p className={styles.b}>
                <strong>The Helping Buddys</strong> 🚀 Say goodbye to inefficiencies in talent acquisition. Laughing Buddys transforms how NFT projects build teams. Our mission is to connect Collab Managers, Mods, Alpha Hunters, and essential members seamlessly with project founders. No more DMs or missed matches! Connect efficiently with Laughing Buddys, a user-friendly platform showcasing your talent and helping you find the perfect fit. For employers, explore a pool of talented individuals. Laughing Buddys is the next step in Web3 evolution, inviting you to join us and shape the future of NFT project collaborations! 😁 Ready to transform your team-building experience? Laughing Buddys invites you to be part of this exciting initiative.
              </p>
            </div>
          </section>

          <section className={styles.mobileSectionBox}>
            <div className={styles.bulletin}>
              <div className={styles.title}><h1>What is our Utility?</h1></div>
              <p className={styles.b}>
                <strong>The Helping Buddys</strong> 🚀 Revolutionizing NFT Project Teams! Connect seamlessly with Laughing Buddys to transform talent acquisition. Showcase your skills and find the perfect fit. Employers, explore a pool of talent. Join us in the Web3 evolution and shape the future of NFT collaborations! 😁 Ready to transform your team-building experience? Laughing Buddys invites you to join this exciting initiative.
              </p>
            </div>
          </section>

        <div className={styles.secondpage}>
          <SecondPage/>
        </div>
          
        <div className={styles.develop}>
          Website Developed by <a href="https://twitter.com/Th3troops">The Troops</a>
        </div>
        </main>
      </WalletModalProvider>
    </WalletProvider>
  );
}
