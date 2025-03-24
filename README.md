# Solana-Powered Energy Grid

A decentralized energy management system that simulates a peer-to-peer energy trading marketplace using the Solana blockchain.

## Overview

This project demonstrates how distributed energy resources (DERs) like solar panels can participate in a decentralized energy market, enabling buildings to trade excess energy with each other through blockchain-based micropayments.

![Solana Energy Grid Dashboard](https://i.imgur.com/YourScreenshotLink.png)

## Features

- **Real-time Energy Simulation**: Simulates energy production and consumption for different building types (residential, commercial, industrial)
- **Blockchain Integration**: Uses Solana blockchain for energy trading transactions
- **Automated Energy Trading**: Matches buyers and sellers based on real-time energy surpluses and deficits
- **Dynamic Pricing**: Adjusts energy prices based on market supply and demand
- **Persistent Wallets**: Creates and manages Solana wallets for each building
- **Interactive Dashboard**: Visualizes energy flows, trades, and blockchain statistics
- **Weather Effects**: Simulates how weather conditions affect renewable energy production

## Technology Stack

- **Frontend**: React.js with Chart.js for data visualization
- **Blockchain**: Solana blockchain (Devnet)
- **State Management**: React Hooks for local state management
- **Styling**: CSS with responsive design

## Project Structure

```
solana-powergrid/
├── public/                # Static files
│   ├── index.html         # HTML entry point
│   └── ...
├── src/                   # Source code
│   ├── components/        # React components
│   │   ├── Dashboard.jsx  # Main dashboard component
│   │   └── Dashboard.css  # Dashboard styling
│   ├── models/            # Simulation models
│   │   └── EnergyModel.js # Energy production/consumption simulation
│   ├── solana/            # Blockchain integration
│   │   ├── energyTrading.js         # Solana transaction logic
│   │   └── localStoragePolyfill.js  # Storage utilities
│   ├── App.jsx            # Root application component
│   └── index.js           # JavaScript entry point
└── package.json           # Project dependencies and scripts
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/naveenreddy007/solona-powergride-.git
cd solona-powergride-
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application should now be running at http://localhost:3000.

## How It Works

### Energy Simulation
- Each building generates or consumes energy based on:
  - Building type (residential, commercial, industrial)
  - Time of day (solar production peaks at noon)
  - Weather conditions (sunny, cloudy, rainy)

### Energy Trading
1. Buildings with excess energy (production > consumption) become sellers
2. Buildings with energy deficits (consumption > production) become buyers
3. The system matches buyers with sellers and executes Solana transactions
4. Energy prices fluctuate based on supply/demand ratio

### Solana Integration
- Each building is assigned a Solana wallet (keypair)
- Energy trades are executed as SOL transfers on the Solana Devnet
- Transaction signatures are stored and linked to the Solana Explorer
- Wallet private keys are stored locally for demo purposes

## Configuration

You can adjust simulation parameters in the dashboard:
- **Weather conditions**: Affects solar energy production
- **Simulation speed**: Controls how quickly time advances
- **Pause/Resume**: Control the simulation flow

## Development Notes

- The system uses the Solana Devnet for transactions
- Each building receives an airdrop of 1 SOL if its balance is low
- For demonstration purposes, some transactions may fall back to simulation if blockchain transactions fail

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Solana blockchain for providing fast, low-cost transactions
- React.js community for excellent documentation and tools
- Chart.js for data visualization capabilities 