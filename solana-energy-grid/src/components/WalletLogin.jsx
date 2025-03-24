import React, { useEffect, useState, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
  useConnection
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
  LedgerWalletAdapter,
  TorusWalletAdapter
} from '@solana/wallet-adapter-wallets';
import {
  WalletModalProvider,
  WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, Connection } from '@solana/web3.js';
import './WalletLogin.css';

// Import wallet adapter styles
require('@solana/wallet-adapter-react-ui/styles.css');

// The main WalletLogin wrapper component
const WalletLogin = ({ onWalletConnect, onDisconnect }) => {
  // Network selection state (default to mainnet for production apps)
  const [networkType, setNetworkType] = useState(WalletAdapterNetwork.Mainnet);
  
  // Get RPC endpoint based on selected network
  const endpoint = useMemo(() => {
    // You can customize these with your own RPC endpoints for better performance
    switch(networkType) {
      case WalletAdapterNetwork.Mainnet:
        return 'https://api.mainnet-beta.solana.com'; // Consider using a paid RPC endpoint for production
      case WalletAdapterNetwork.Testnet:
        return clusterApiUrl(WalletAdapterNetwork.Testnet);
      case WalletAdapterNetwork.Devnet:
        return clusterApiUrl(WalletAdapterNetwork.Devnet);
      default:
        return clusterApiUrl(WalletAdapterNetwork.Mainnet);
    }
  }, [networkType]);

  // Initialize wallets - include all major wallet adapters for production use
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(), 
      new CoinbaseWalletAdapter(),
      new LedgerWalletAdapter(),
      new TorusWalletAdapter()
    ],
    [networkType] // Re-initialize if network changes
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletContent 
            onWalletConnect={onWalletConnect} 
            onDisconnect={onDisconnect}
            networkType={networkType}
            setNetworkType={setNetworkType}
            endpoint={endpoint}
          />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

// The inner content that uses the wallet hooks
const WalletContent = ({ 
  onWalletConnect, 
  onDisconnect,
  networkType,
  setNetworkType,
  endpoint
}) => {
  const { connection } = useConnection();
  const { publicKey, wallet, connected, disconnect } = useWallet();
  const [balance, setBalance] = useState(null);
  const [notification, setNotification] = useState(null);
  const [networkStatus, setNetworkStatus] = useState('checking');
  const [transactionCount, setTransactionCount] = useState(null);

  // Format public key for display
  const formatPublicKey = (publicKey) => {
    if (!publicKey) return 'N/A';
    const key = publicKey.toString();
    return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
  };
  
  // Display notification for 3 seconds
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Network display names
  const getNetworkDisplayName = () => {
    switch(networkType) {
      case WalletAdapterNetwork.Mainnet:
        return 'Mainnet';
      case WalletAdapterNetwork.Testnet:
        return 'Testnet';
      case WalletAdapterNetwork.Devnet:
        return 'Devnet';
      default:
        return 'Unknown';
    }
  };

  // Check network status
  useEffect(() => {
    const checkNetworkStatus = async () => {
      try {
        setNetworkStatus('checking');
        const conn = new Connection(endpoint, 'confirmed');
        const version = await conn.getVersion();
        setNetworkStatus('online');
      } catch (error) {
        console.error('Network status check failed:', error);
        setNetworkStatus('offline');
      }
    };
    
    checkNetworkStatus();
  }, [endpoint]);

  // Effect to update parent component when wallet connects/disconnects
  useEffect(() => {
    if (connected && publicKey && wallet) {
      const walletInfo = {
        publicKey: publicKey,
        name: wallet.name || 'Solana Wallet',
        balance: balance || 0,
        network: networkType,
        adapter: wallet.adapter
      };
      
      onWalletConnect(walletInfo);
      showNotification(`Connected to ${wallet.name} on ${getNetworkDisplayName()}`);
    } else if (onDisconnect) {
      onDisconnect();
    }
  }, [connected, publicKey, wallet, balance, networkType, onWalletConnect, onDisconnect]);

  // Effect to fetch wallet balance when connected
  useEffect(() => {
    let isMounted = true;
    
    const fetchWalletData = async () => {
      if (connected && publicKey) {
        try {
          // Fetch wallet balance
          const bal = await connection.getBalance(publicKey);
          if (isMounted) {
            // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
            const solBalance = bal / 1000000000;
            setBalance(solBalance);
          }
          
          // Fetch transaction count (signature history)
          const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 1000 });
          if (isMounted) {
            setTransactionCount(signatures.length);
          }
        } catch (error) {
          console.error('Error fetching wallet data:', error);
          if (isMounted) {
            setBalance(0);
          }
        }
      } else if (isMounted) {
        setBalance(null);
        setTransactionCount(null);
      }
    };
    
    fetchWalletData();
    
    return () => {
      isMounted = false;
    };
  }, [connection, publicKey, connected, networkType]);

  // Handle disconnect with confirmation for production safety
  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect your wallet?')) {
      disconnect();
      showNotification('Wallet disconnected', 'info');
    }
  };
  
  // Handle network change
  const handleNetworkChange = (e) => {
    const newNetwork = e.target.value;
    setNetworkType(newNetwork);
    showNotification(`Network switched to ${getNetworkDisplayName(newNetwork)}`, 'info');
    
    // If wallet is connected, inform about potential need to reconnect
    if (connected) {
      showNotification('Please reconnect your wallet to update the network connection', 'warning');
    }
  };

  return (
    <div className="wallet-login-container">
      <div className="wallet-header-row">
        <div className="wallet-network-selector">
          <select 
            value={networkType} 
            onChange={handleNetworkChange}
            className={`network-select ${networkStatus}`}
          >
            <option value={WalletAdapterNetwork.Mainnet}>Mainnet</option>
            <option value={WalletAdapterNetwork.Testnet}>Testnet</option>
            <option value={WalletAdapterNetwork.Devnet}>Devnet</option>
          </select>
          <div className={`network-status ${networkStatus}`}>
            {networkStatus === 'online' ? '●' : networkStatus === 'offline' ? '○' : '◌'}
          </div>
        </div>
        
        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}
      </div>
      
      {connected && publicKey ? (
        <div className="connected-wallet">
          <div className="wallet-info-container">
            <div className="wallet-primary-info">
              <div className="wallet-icon">{wallet?.name?.charAt(0) || 'W'}</div>
              <div className="wallet-main-info">
                <h3>{wallet?.name || 'Solana Wallet'}</h3>
                <p className="wallet-address" title={publicKey.toString()}>
                  {formatPublicKey(publicKey)}
                </p>
              </div>
              <button className="btn-disconnect" onClick={handleDisconnect}>
                Disconnect
              </button>
            </div>
            
            <div className="wallet-details">
              <div className="wallet-stat">
                <span className="stat-label">Balance</span>
                <span className="stat-value">{balance?.toFixed(4) || '0.0000'} SOL</span>
              </div>
              <div className="wallet-stat">
                <span className="stat-label">Network</span>
                <span className="stat-value">{getNetworkDisplayName()}</span>
              </div>
              {transactionCount !== null && (
                <div className="wallet-stat">
                  <span className="stat-label">Transactions</span>
                  <span className="stat-value">{transactionCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="wallet-connect-container">
          <div className="connect-content">
            <h3>Connect Wallet</h3>
            <p className="connect-description">
              Connect your Solana wallet to access the Energy Grid platform on {getNetworkDisplayName()}
            </p>
            <div className="connect-button-container">
              <WalletMultiButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletLogin; 