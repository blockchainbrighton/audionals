// js/player/playerCharacterDesign.js
import * as PWeapons from './playerWeapons.js'; // For weapon types

export const characterDesignProperties = {
    isMoving: false,
    walkCycleFrame: 0,
    limbAnimationSpeed: 150, // ms per frame change for walking
    lastLimbFrameChangeTime: 0,

    // Body and Limbs
    bodyColor: '#3F3', // Default player color, can be overridden by player.color
    limbColor: '#2A2',
    armLength: 0,
    legLength: 0,
    headRadius: 0,

    // Weapon holding visuals
    // weaponOffsetX, weaponOffsetY are no longer strictly needed as we calculate hand position
    weaponAngle: 0, // For aiming or swinging
    lastAttackAnimationTime: 0,
    attackAnimationDuration: 300, // ms for weapon swing/fire animation (slightly longer for more noticeable swing)
    isAttacking: false,
    facingDirection: 1, // 1 for right, -1 for left (could be expanded for up/down aiming)
    lastDeltaX: 0, // To determine facing direction
};

export function initCharacterDesign() {
    // 'this' refers to the player object (which has width, height, color from playerCore)
    this.isMoving = false;
    this.walkCycleFrame = 0;
    this.lastLimbFrameChangeTime = 0;

    this.bodyColor = this.color || characterDesignProperties.bodyColor; // Use player.color if set
    this.limbColor = characterDesignProperties.limbColor;

    // Define body part sizes relative to player's main dimensions
    this.headRadius = this.height * 0.18;
    this.armLength = this.height * 0.35;
    this.legLength = this.height * 0.45;

    this.weaponAngle = 0;
    this.lastAttackAnimationTime = 0;
    this.isAttacking = false;
    this.facingDirection = 1; // Default to facing right
    this.lastDeltaX = 0;
}

export function updateCharacterAnimation(deltaTime, dx = 0 /*, dy = 0 */) {
    // 'this' refers to the player object
    const now = Date.now();

    // Determine facing direction based on movement
    if (dx > 0) this.facingDirection = 1; // Right
    else if (dx < 0) this.facingDirection = -1; // Left
    // (If dy is used for aiming, that could also influence a facingAngle)


    // Walking animation
    if (this.isMoving) {
        if (now - this.lastLimbFrameChangeTime > this.limbAnimationSpeed) {
            this.walkCycleFrame = (this.walkCycleFrame + 1) % 4; // 0, 1, 2, 3
            this.lastLimbFrameChangeTime = now;
        }
    } else {
        this.walkCycleFrame = 0; // Idle standing frame
    }
    // Reset isMoving here. It will be set true in playerCore.handleInputMovement if there's actual movement.
    // It's already reset in handleInputMovement after processing, which is better.
    // So, we can rely on player.isMoving being set correctly before this is called.

    // Attack animation
    if (this.isAttacking) {
        const elapsed = now - this.lastAttackAnimationTime;
        if (elapsed > this.attackAnimationDuration) {
            this.isAttacking = false;
            this.weaponAngle = 0; // Reset angle
        } else {
            const progress = elapsed / this.attackAnimationDuration;
            if (this.equippedWeapon && this.equippedWeapon.type === PWeapons.weaponTypes.MELEE) {
                // More pronounced swing: starts back, swings forward, returns slightly
                if (progress < 0.1) { // Wind up
                    this.weaponAngle = -0.4 * this.facingDirection;
                } else if (progress < 0.7) { // Swing
                    this.weaponAngle = Math.sin((progress - 0.1) / 0.6 * Math.PI) * 1.2 * this.facingDirection;
                } else { // Recover
                     this.weaponAngle = Math.sin(Math.PI) * 1.2 * this.facingDirection * (1 - (progress - 0.7)/0.3);
                }

            } else if (this.equippedWeapon && this.equippedWeapon.type === PWeapons.weaponTypes.RANGED) {
                // Recoil effect: sharp kick back, then dampens
                const recoilMagnitude = -0.3 * this.facingDirection; // Recoil pushes weapon back/up
                this.weaponAngle = recoilMagnitude * Math.sin(progress * Math.PI * 2) * (1 - progress); // Dampening sine wave
            } else { // Unarmed
                // Similar to melee, but shorter, quicker punch animation
                 if (progress < 0.2) this.weaponAngle = -0.3 * this.facingDirection;
                 else if (progress < 0.6) this.weaponAngle = Math.sin((progress - 0.2) / 0.4 * Math.PI) * 0.5 * this.facingDirection;
                 else this.weaponAngle = 0;
            }
        }
    }
    // Storing dx for facing direction persistence when idle is handled in handleInputMovement
    if(dx !== 0) this.lastDeltaX = dx;

    // Resetting this.isMoving is done in handleInputMovement in playerCore
    // this.isMoving = false;
}

export function startAttackAnimation() {
    // 'this' refers to the player object
    this.isAttacking = true;
    this.lastAttackAnimationTime = Date.now();
    // If ranged, and you have mouse aiming, you might set weaponAngle towards mouse here initially.
    // For now, attack animation itself handles the angles.
}


export function renderCharacterDetails(ctx) {
    // 'this' refers to the player object, which includes x, y, width, height, color, facingDirection
    ctx.save();
    ctx.strokeStyle = this.limbColor;
    ctx.lineWidth = Math.max(2, this.width * 0.1); // Thinner limbs
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';


    const playerCenterX = this.x + this.width / 2;
    const playerBaseY = this.y + this.height; // Bottom of the player's bounding box

    // --- Body ---
    // Torso: A rounded rectangle
    const torsoHeight = this.height * 0.45;
    const torsoWidth = this.width * 0.4;
    const torsoX = playerCenterX - (torsoWidth / 2);
    // Position torso slightly above the center to make space for head and legs
    const torsoY = this.y + this.height * 0.25;

    ctx.fillStyle = this.color; // Use player's core color, globalAlpha applied by playerCore
    ctx.beginPath();
    // A simple rectangle for now, can be a rounded rect path
    ctx.rect(torsoX, torsoY, torsoWidth, torsoHeight);
    ctx.fill();

    // --- Head ---
    const headX = playerCenterX;
    const headY = torsoY - this.headRadius * 0.8; // Position head on top of torso
    ctx.beginPath();
    ctx.arc(headX, headY, this.headRadius, 0, Math.PI * 2);
    ctx.fill(); // Same color as body, or a different one


    // --- Limb Animation Values ---
    // Walk cycle affects limb positions: 0: neutral, 1: forward, 2: neutral, 3: backward
    const walkCycleOffsets = [
        { arm: 0, leg: 0 },        // Frame 0 (idle or mid-step)
        { arm: 0.5, leg: 0.7 },  // Frame 1 (one side forward)
        { arm: 0, leg: 0 },        // Frame 2 (mid-step)
        { arm: -0.5, leg: -0.7 }  // Frame 3 (other side forward)
    ];
    const currentFrameOffsets = walkCycleOffsets[this.walkCycleFrame];

    // --- Legs ---
    // Attachment points on torso
    const hipXOffset = torsoWidth * 0.25 * this.facingDirection; // Hips slightly narrower than shoulders
    const hipY = torsoY + torsoHeight * 0.9; // Bottom of torso

    // Left Leg (relative to facing direction)
    const leftLegAngle = (this.facingDirection === 1 ? currentFrameOffsets.leg : -currentFrameOffsets.leg) * 0.5; // Angle in radians
    const leftKneeX = playerCenterX - hipXOffset + Math.sin(leftLegAngle) * (this.legLength / 2);
    const leftKneeY = hipY + Math.cos(leftLegAngle) * (this.legLength / 2);
    const leftFootX = leftKneeX + Math.sin(leftLegAngle * 0.8) * (this.legLength / 2); // Bend knee a bit
    const leftFootY = leftKneeY + Math.cos(leftLegAngle * 0.8) * (this.legLength / 2);

    ctx.beginPath();
    ctx.moveTo(playerCenterX - hipXOffset, hipY);
    ctx.lineTo(leftKneeX, leftKneeY);
    ctx.lineTo(leftFootX, leftFootY);
    ctx.stroke();

    // Right Leg
    const rightLegAngle = (this.facingDirection === 1 ? -currentFrameOffsets.leg : currentFrameOffsets.leg) * 0.5;
    const rightKneeX = playerCenterX + hipXOffset + Math.sin(rightLegAngle) * (this.legLength / 2);
    const rightKneeY = hipY + Math.cos(rightLegAngle) * (this.legLength / 2);
    const rightFootX = rightKneeX + Math.sin(rightLegAngle * 0.8) * (this.legLength / 2);
    const rightFootY = rightKneeY + Math.cos(rightLegAngle * 0.8) * (this.legLength / 2);

    ctx.beginPath();
    ctx.moveTo(playerCenterX + hipXOffset, hipY);
    ctx.lineTo(rightKneeX, rightKneeY);
    ctx.lineTo(rightFootX, rightFootY);
    ctx.stroke();


    // --- Arms & Weapon ---
    const shoulderXOffset = torsoWidth * 0.3 * this.facingDirection;
    const shoulderY = torsoY + torsoHeight * 0.2;

    // Determine which arm holds the weapon (based on facing direction for simplicity)
    // Weapon hand is "front" hand. Back arm swings.
    const weaponHandIsRight = this.facingDirection === 1;

    let frontArmAngleBase = 0;
    let backArmAngleBase = (this.facingDirection === 1 ? -currentFrameOffsets.arm : currentFrameOffsets.arm) * 0.6;

    // If attacking, front arm is controlled by weaponAngle
    // Otherwise, it gets a slight swing based on walk cycle
    if (this.isAttacking) {
        frontArmAngleBase = this.weaponAngle;
    } else {
        frontArmAngleBase = (this.facingDirection === 1 ? currentFrameOffsets.arm : -currentFrameOffsets.arm) * 0.6;
    }

    // Front Arm (holds weapon)
    const frontShoulderX = playerCenterX + shoulderXOffset;
    const frontElbowX = frontShoulderX + Math.cos(frontArmAngleBase - Math.PI/2) * (this.armLength / 2);
    const frontElbowY = shoulderY + Math.sin(frontArmAngleBase - Math.PI/2) * (this.armLength / 2);
    // Hand position includes weapon angle influence only if weapon makes sense to be angled
    let frontHandAngle = frontArmAngleBase;
    if(this.equippedWeapon && this.equippedWeapon.type === PWeapons.weaponTypes.MELEE && this.isAttacking) {
         // For melee, the "hand" also follows the weapon swing more directly
        frontHandAngle = this.weaponAngle;
    } else if (this.equippedWeapon && this.equippedWeapon.type === PWeapons.weaponTypes.RANGED && this.isAttacking) {
        // For ranged, hand might be more stable, weapon recoils
        frontHandAngle = frontArmAngleBase * 0.5 + this.weaponAngle * 0.5; // Mix of arm and weapon recoil
    }


    const frontHandX = frontElbowX + Math.cos(frontHandAngle - Math.PI/2) * (this.armLength / 2);
    const frontHandY = frontElbowY + Math.sin(frontHandAngle - Math.PI/2) * (this.armLength / 2);

    ctx.beginPath();
    ctx.moveTo(frontShoulderX, shoulderY);
    ctx.lineTo(frontElbowX, frontElbowY);
    ctx.lineTo(frontHandX, frontHandY);
    ctx.stroke();

    // Back Arm (swings freely or idle)
    const backShoulderX = playerCenterX - shoulderXOffset;
    const backElbowX = backShoulderX + Math.cos(backArmAngleBase - Math.PI / 2) * (this.armLength / 2);
    const backElbowY = shoulderY + Math.sin(backArmAngleBase - Math.PI / 2) * (this.armLength / 2);
    const backHandX = backElbowX + Math.cos(backArmAngleBase * 0.8 - Math.PI / 2) * (this.armLength / 2); // Slightly different angle for hand
    const backHandY = backElbowY + Math.sin(backArmAngleBase * 0.8 - Math.PI / 2) * (this.armLength / 2);

    ctx.beginPath();
    ctx.moveTo(backShoulderX, shoulderY);
    ctx.lineTo(backElbowX, backElbowY);
    ctx.lineTo(backHandX, backHandY);
    ctx.stroke();


    // --- Render Equipped Weapon ---
    if (this.equippedWeapon && this.equippedWeapon.char) {
        ctx.fillStyle = '#AAA'; // Generic weapon color
        ctx.font = `${this.height * (this.equippedWeapon.type === PWeapons.weaponTypes.RANGED ? 0.6 : 0.8)}px Monospace`;

        // Save context state for weapon's own transformation
        ctx.save();
        // Translate to the front hand's position
        ctx.translate(frontHandX, frontHandY);

        // Rotate weapon based on weaponAngle (which is influenced by facing direction)
        // Add PI/2 because characters in fonts are usually upright.
        // Adjust rotation further depending on how the weapon should be "held"
        let weaponRotation = this.weaponAngle;
        if(this.equippedWeapon.type !== PWeapons.weaponTypes.RANGED) {
           weaponRotation += (Math.PI/2 * this.facingDirection);
        } else {
            // Ranged weapons might point more directly based on weaponAngle without the extra PI/2
            weaponRotation += (this.facingDirection === -1 ? Math.PI : 0);
        }


        ctx.rotate(weaponRotation);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.equippedWeapon.char, 0, 0); // Draw weapon at the hand's (now 0,0)

        ctx.restore(); // Restore context state (removes weapon's translation/rotation)
    }

    ctx.restore(); // Restore initial context state (globalAlpha etc.)
}