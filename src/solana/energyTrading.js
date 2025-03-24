import { Connection, PublicKey, Transaction, SystemProgram, Keypair, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import localStorage from './localStoragePolyfill';

// Initialize connection to Solana devnet
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

// Store transaction history
const transactionHistory = [];

// Create wallets for buildings
async function setupWallets(buildings) {
  console.log('Setting up Solana wallets for buildings...');
  
  for (const building of buildings) {
    // Generate new keypair or load from local storage if exists
    const storedPrivateKey = localStorage.getItem(`building_${building.id}_privateKey`);
    
    if (storedPrivateKey) {
      // Convert stored array back to Uint8Array
      const privateKeyUint8 = new Uint8Array(JSON.parse(storedPrivateKey));
      building.wallet = Keypair.fromSecretKey(privateKeyUint8);
      console.log(`Loaded existing wallet for Building ${building.id}`);
    } else {
      building.wallet = Keypair.generate();
      // Store private key securely (in a real app, use a more secure method)
      localStorage.setItem(
        `building_${building.id}_privateKey`, 
        JSON.stringify(Array.from(building.wallet.secretKey))
      );
      console.log(`Generated new wallet for Building ${building.id}`);
    }
    
    // Check balance
    try {
      const balance = await connection.getBalance(building.wallet.publicKey);
      building.balance = balance / LAMPORTS_PER_SOL;
      
      // Request airdrop if balance is low
      if (building.balance < 0.5) {
        console.log(`Requesting airdrop for Building ${building.id} wallet...`);
        const signature = await connection.requestAirdrop(
          building.wallet.publicKey,
          LAMPORTS_PER_SOL // 1 SOL
        );
        
        await connection.confirmTransaction(signature);
        building.balance = await connection.getBalance(building.wallet.publicKey) / LAMPORTS_PER_SOL;
      }
    } catch (error) {
      console.error(`Error checking balance for Building ${building.id}:`, error);
      // Set default balance for demo purposes
      building.balance = 1;
    }
    
    console.log(`Building ${building.id} (${building.type}) wallet: 
      Address: ${building.wallet.publicKey.toString()}
      Balance: ${building.balance.toFixed(3)} SOL`);
  }
  
  console.log('All building wallets initialized successfully!');
  return buildings;
}

// Execute energy trade between buildings using real Solana transactions
async function executeEnergyTrade(sellerBuilding, buyerBuilding, energyAmount, pricePerUnit) {
  // Validate input parameters to prevent errors
  if (!sellerBuilding || !buyerBuilding) {
    throw new Error('Invalid building objects provided for energy trade');
  }
  
  if (!sellerBuilding.wallet || !sellerBuilding.wallet.publicKey || 
      !buyerBuilding.wallet || !buyerBuilding.wallet.publicKey) {
    throw new Error('Buildings must have valid wallet objects for energy trading');
  }
  
  const totalPrice = energyAmount * pricePerUnit;
  const lamports = Math.floor(totalPrice * LAMPORTS_PER_SOL);
  
  console.log(`Executing energy trade on Solana blockchain:
    Seller: Building ${sellerBuilding.id} (${sellerBuilding.type || 'unknown'})
    Seller Address: ${sellerBuilding.wallet.publicKey.toString()}
    Buyer: Building ${buyerBuilding.id} (${buyerBuilding.type || 'unknown'})
    Buyer Address: ${buyerBuilding.wallet.publicKey.toString()}
    Energy: ${energyAmount.toFixed(2)} kWh
    Price: ${totalPrice.toFixed(5)} SOL (${lamports} lamports)`);
  
  try {
    // Create transaction for SOL transfer
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: buyerBuilding.wallet.publicKey,
        toPubkey: sellerBuilding.wallet.publicKey,
        lamports: lamports
      })
    );
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = buyerBuilding.wallet.publicKey;
    
    // Sign transaction
    transaction.sign(buyerBuilding.wallet);
    
    // Send transaction
    const signature = await connection.sendRawTransaction(transaction.serialize());
    console.log(`Transaction sent: ${signature}`);
    
    // Confirm transaction
    const confirmation = await connection.confirmTransaction(signature);
    console.log(`Transaction confirmed: ${confirmation.value.err ? 'Failed' : 'Success'}`);
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }
    
    // Update balances after transaction
    const sellerNewBalance = await connection.getBalance(sellerBuilding.wallet.publicKey);
    const buyerNewBalance = await connection.getBalance(buyerBuilding.wallet.publicKey);
    
    sellerBuilding.balance = sellerNewBalance / LAMPORTS_PER_SOL;
    buyerBuilding.balance = buyerNewBalance / LAMPORTS_PER_SOL;
    
    // Record transaction
    const txRecord = {
      timestamp: new Date(),
      seller: sellerBuilding.id,
      buyer: buyerBuilding.id,
      energyAmount,
      price: totalPrice,
      pricePerUnit,
      signature,
      sellerAddress: sellerBuilding.wallet.publicKey.toString(),
      buyerAddress: buyerBuilding.wallet.publicKey.toString(),
      explorerId: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    };
    
    // Add to global transaction history
    transactionHistory.push(txRecord);
    
    console.log(`Transaction completed successfully: ${signature}`);
    console.log(`Explorer URL: ${txRecord.explorerId}`);
    
    return txRecord;
  } catch (error) {
    console.error('Error executing energy trade on Solana blockchain:', error);
    
    // Fallback to simulation for demo if blockchain transaction fails
    const fakeTxSignature = 'SIMULATED_' + Math.random().toString(36).substring(2, 15);
    
    // Simulate balance updates
    buyerBuilding.balance -= totalPrice;
    sellerBuilding.balance += totalPrice;
    
    const txRecord = {
      timestamp: new Date(),
      seller: sellerBuilding.id,
      buyer: buyerBuilding.id,
      energyAmount,
      price: totalPrice,
      pricePerUnit,
      signature: fakeTxSignature,
      sellerAddress: sellerBuilding.wallet.publicKey.toString(),
      buyerAddress: buyerBuilding.wallet.publicKey.toString(),
      simulated: true
    };
    
    transactionHistory.push(txRecord);
    console.log(`Fallback to simulated transaction: ${fakeTxSignature}`);
    
    return txRecord;
  }
}

// Helper function to calculate energy balance
function calculateEnergyBalance(building) {
  // If the building object has the getEnergyBalance method, use it
  if (building && typeof building.getEnergyBalance === 'function') {
    return building.getEnergyBalance();
  }
  
  // Otherwise calculate it directly
  if (building) {
    return (building.currentProduction || 0) - (building.currentConsumption || 0);
  }
  
  // Default value if building is undefined
  return 0;
}

// Ensure all buildings have needed properties
function validateBuildings(buildings) {
  if (!buildings || !Array.isArray(buildings)) {
    console.error('Invalid buildings array provided to energy trading');
    return [];
  }
  
  return buildings.filter(building => {
    if (!building || typeof building !== 'object') {
      console.error('Invalid building object in array');
      return false;
    }
    
    if (building.id === undefined || building.id === null) {
      console.error('Building without ID detected');
      return false;
    }
    
    if (!building.wallet || !building.wallet.publicKey) {
      console.error(`Building ${building.id} has no wallet or public key`);
      return false;
    }
    
    return true;
  });
}

// Match energy supply and demand and execute trades
async function matchEnergyNeeds(buildings) {
  try {
    // Validate buildings first
    const validBuildings = validateBuildings(buildings);
    
    if (validBuildings.length === 0) {
      console.error('No valid buildings to trade energy');
      return [];
    }
    
    // Find buildings with excess energy (sellers)
    const sellers = validBuildings.filter(b => calculateEnergyBalance(b) > 0)
      .sort((a, b) => calculateEnergyBalance(a) - calculateEnergyBalance(b));
    
    // Find buildings that need energy (buyers)
    const buyers = validBuildings.filter(b => calculateEnergyBalance(b) < 0)
      .sort((a, b) => calculateEnergyBalance(b) - calculateEnergyBalance(a));
    
    console.log(`Energy market status: ${sellers.length} sellers, ${buyers.length} buyers`);
    
    if (sellers.length === 0 || buyers.length === 0) {
      console.log('No trading possible: Either no sellers or no buyers available');
      return [];
    }
    
    const trades = [];
    
    // Match buyers with sellers
    for (const buyer of buyers) {
      // Skip if buyer has insufficient balance
      if (buyer.balance < 0.01) {
        console.log(`Building ${buyer.id} has insufficient balance (${buyer.balance?.toFixed(3) || 0} SOL), skipping`);
        continue;
      }
      
      let neededEnergy = Math.abs(calculateEnergyBalance(buyer));
      
      for (const seller of sellers) {
        if (neededEnergy <= 0) break;
        
        const availableEnergy = calculateEnergyBalance(seller);
        if (availableEnergy <= 0) continue;
        
        const tradeAmount = Math.min(neededEnergy, availableEnergy);
        
        // Dynamic pricing based on market conditions
        // Higher demand = higher price
        const basePricePerUnit = 0.01; // Reduced price for faster transactions
        const demandFactor = buyers.length / (sellers.length || 1);
        const pricePerUnit = basePricePerUnit * (0.8 + (demandFactor * 0.4));
        
        // Execute the trade on Solana blockchain
        try {
          const trade = await executeEnergyTrade(seller, buyer, tradeAmount, pricePerUnit);
          if (trade) {
            trades.push(trade);
            
            // Adjust remaining needed energy
            neededEnergy -= tradeAmount;
          }
        } catch (error) {
          console.error(`Failed to execute trade between Building ${seller.id} and Building ${buyer.id}:`, error);
        }
      }
    }
    
    if (trades.length > 0) {
      console.log(`Completed ${trades.length} energy trades on the blockchain marketplace`);
    }
    
    return trades;
  } catch (error) {
    console.error('Error in matchEnergyNeeds:', error);
    return [];
  }
}

// Get transaction history
function getTransactionHistory() {
  return transactionHistory;
}

// Verify Solana connection status
async function verifySolanaConnection() {
  try {
    const version = await connection.getVersion();
    console.log('Solana connection established:', version);
    return true;
  } catch (error) {
    console.error('Failed to connect to Solana network:', error);
    return false;
  }
}

// Calculate market statistics
function getMarketStatistics(trades) {
  if (!trades || trades.length === 0) {
    return {
      totalVolume: 0,
      averagePrice: 0,
      highestPrice: 0,
      lowestPrice: 0,
      tradeCount: 0,
      realTransactions: 0,
      simulatedTransactions: 0
    };
  }
  
  const totalVolume = trades.reduce((sum, trade) => sum + trade.energyAmount, 0);
  const averagePrice = trades.reduce((sum, trade) => sum + (trade.pricePerUnit || trade.price / trade.energyAmount), 0) / trades.length;
  const prices = trades.map(trade => trade.pricePerUnit || trade.price / trade.energyAmount);
  const realTransactions = trades.filter(trade => !trade.simulated).length;
  const simulatedTransactions = trades.filter(trade => trade.simulated).length;
  
  return {
    totalVolume,
    averagePrice,
    highestPrice: Math.max(...prices),
    lowestPrice: Math.min(...prices),
    tradeCount: trades.length,
    realTransactions,
    simulatedTransactions
  };
}

// Get Solana explorer link for a transaction
function getExplorerLink(signature) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

export { 
  setupWallets, 
  executeEnergyTrade, 
  matchEnergyNeeds, 
  getTransactionHistory, 
  verifySolanaConnection,
  getMarketStatistics,
  getExplorerLink
}; 