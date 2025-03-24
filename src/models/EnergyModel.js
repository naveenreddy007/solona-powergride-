class Building {
  constructor(id, type, solarCapacity) {
    this.id = id;
    this.type = type; // residential, commercial, industrial
    this.solarCapacity = solarCapacity; // kW
    this.currentProduction = 0;
    this.currentConsumption = 0;
    this.wallet = null; // Will hold Solana wallet
    this.balance = 0; // SOL balance
    this.energyTransactions = [];
  }

  simulateProduction(timeOfDay, weatherCondition) {
    // Solar panels produce based on time of day and weather
    const hourFactor = Math.sin(((timeOfDay / 24) * Math.PI));
    const weatherFactor = weatherCondition === 'sunny' ? 1 : 
                          weatherCondition === 'cloudy' ? 0.6 : 0.3;
    
    this.currentProduction = this.solarCapacity * Math.max(0, hourFactor) * weatherFactor;
    return this.currentProduction;
  }

  simulateConsumption(timeOfDay) {
    // Different building types have different consumption patterns
    let baseDemand;
    switch(this.type) {
      case 'residential':
        // Higher in morning and evening
        baseDemand = 2 + Math.sin(((timeOfDay - 7) / 24) * 2 * Math.PI) + 
                    Math.sin(((timeOfDay - 19) / 24) * 2 * Math.PI);
        break;
      case 'commercial':
        // Higher during work hours
        baseDemand = 5 + 8 * Math.sin(((timeOfDay - 13) / 24) * Math.PI);
        baseDemand = timeOfDay >= 8 && timeOfDay <= 18 ? baseDemand : baseDemand * 0.3;
        break;
      case 'industrial':
        // Relatively constant
        baseDemand = 15 + Math.random() * 5;
        break;
      default:
        baseDemand = 5;
    }
    
    this.currentConsumption = Math.max(0, baseDemand + (Math.random() - 0.5) * 2);
    return this.currentConsumption;
  }

  getEnergyBalance() {
    return this.currentProduction - this.currentConsumption;
  }
}

// Create a neighborhood of buildings
function createNeighborhood(buildingCount) {
  const buildings = [];
  
  // Create a mix of building types
  for (let i = 0; i < buildingCount; i++) {
    const type = i % 5 === 0 ? 'industrial' : 
                i % 3 === 0 ? 'commercial' : 'residential';
    
    const solarCapacity = type === 'industrial' ? 50 + Math.random() * 150 :
                          type === 'commercial' ? 20 + Math.random() * 40 :
                          5 + Math.random() * 15;
                          
    buildings.push(new Building(i, type, solarCapacity));
  }
  
  return buildings;
}

export { Building, createNeighborhood }; 