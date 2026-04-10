This system provides near-real-time monitoring of Commodity Exchanges (CX) via FIO API Webhooks that PRUNplanner processes and streams to your browser. It is designed to allow you to monitor market movements and create alerts for automated reaction to changes.

# Data Stream Mechanics

FIO API receives data from Prosperous Universe once a user sees a change happening and sends data to PRUNplanner bundled every 30 seconds. PRUNplanner itself will persist the last 500 datapoints so you don't start from scratch when opening this view.

Please note: there won't be datapoints for all available materials and exchanges, only those were a change happened and a user accessed it ingame. The live overview will continuously build up the more data was received.

# Live View

The right hand side of this view display the received datapoints based on their material ticker and exchange combination, showing you the current traded price, bid and ask prices, the spread between them and the currently active buy and sell volumes.

Prices have another indicator showing the latest change in percent.

# Alert Engine

This system uses a recursive logic engine to evaluate incoming data against previously received data and your custom alert configuration.

## Setup
### Logical Operators

You can chain conditions to reduce noise:

- **AND**: All conditions must be met (e.g. Price > 100 **AND** Volume != Previous Volume)
- **OR**: Any single condition triggers the alert

### Comparisons:

- **GT**: Greater Than
- **LT**: Less Than
- **EQ**: Equal
- **NEQ**: Not Equal

## Comparison Targets:

- **VALUE**: Compares a field to a fixed number / text.
  - Hard price floors or ceiling breaks, filter on specific materials or exchanges.
- **Previous**: Compares current data to the immediate last data.
  - Detecting "Flash" changes or sudden spikes.
- **Offset %**: Compares to the last tick with a percentage offset.
  - Monitoring volatility (e.g. "Alert if prices rise > 2%"). You can setup a OR condition with GT / LT combining positive and negative changes.

## Setting up Alerts
- Define the scope: Choose a field
- Select severity: Low, Medium, High
- Configure logic: Use operators, comparisons and comparison targets
- Change the Alerts name
- Enable the detector
- Save
