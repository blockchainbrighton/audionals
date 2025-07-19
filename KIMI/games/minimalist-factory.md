# Minimalist Factory

## Description

Minimalist Factory is a simulation game where you build and manage a factory to produce a target output. The game is played on a 6x6 grid where you can place different types of machines to create a production line. The goal is to strategically place and connect machines to generate resources, process them, and ultimately sell them to meet the output target.

## How to Play

### The Goal

The primary objective of the game is to reach the target output of 50. The current output and the target are displayed below the factory grid.

### The Grid

The game is played on a 6x6 grid. Each cell on the grid can hold one machine.

### Machine Types

There are four types of machines you can use in your factory:

*   **Generator (⚡):** This machine generates new resources. It doesn't require any input and produces 1 unit of resource per tick.
*   **Conveyor (▶️):** This machine moves resources from one machine to another. It does not produce or consume resources.
*   **Assembler (🏭):** This machine consumes 2 units of a resource to produce 3 units of a more advanced resource.
*   **Seller (💰):** This machine sells any resources it receives, converting them into output.

### Controls

*   **Generator, Conveyor, Assembler, Seller Buttons:** Clicking one of these buttons will place the corresponding machine on a random empty tile on the grid.
*   **Reset Button:** This button will clear the entire factory grid, reset the output to 0, and allow you to start over.

### Gameplay Instructions

1.  **Placing Machines:**
    *   Click on the "Generator", "Conveyor", "Assembler", or "Seller" buttons to place a machine onto an empty tile. Machines are placed randomly on available empty tiles.

2.  **Connecting Machines:**
    *   To create a production line, you need to connect the machines.
    *   First, click on the machine you want to be the *source* of the resources. It will be highlighted with a blue outline to show it's selected.
    *   Next, click on an adjacent machine (up, down, left, or right) that you want to be the *destination*. This will create a connection, and an arrow will appear on the source machine indicating the direction of the resource flow.
    *   A machine can only have one output connection.

3.  **Creating a Production Line:**
    *   A basic production line starts with a **Generator** to create resources.
    *   Connect the **Generator** to a **Conveyor** to move the resources. You can chain multiple conveyors together to transport resources across the grid.
    *   To process resources into more valuable ones, connect a Conveyor to an **Assembler**. The Assembler will take 2 units of the basic resource and turn them into 3 units of a more advanced resource.
    *   Finally, to generate output, connect your production line to a **Seller**. The Seller will take any resources it receives and add them to your total output.

4.  **Winning the Game:**
    *   The game is won when your "Output" reaches the "Target" of 50. A message will appear to congratulate you on reaching the target.

### Example Workflow

1.  Place a **Generator** (⚡).
2.  Place a **Conveyor** (▶️) next to the Generator.
3.  Click the Generator, then click the Conveyor to connect them. You will see an arrow on the Generator pointing to the Conveyor.
4.  Place a **Seller** (💰) next to the Conveyor.
5.  Click the Conveyor, then click the Seller to connect them.
6.  The Generator will produce resources, which will be moved by the Conveyor to the Seller. The Seller will then increase your output.
7.  To get a higher output faster, you can incorporate an **Assembler** (🏭) into your production line before the Seller. For example: Generator -> Conveyor -> Assembler -> Conveyor -> Seller.