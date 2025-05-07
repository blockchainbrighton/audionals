// js/player/playerCharacterDesign.js
import * as PWeapons from './playerWeapons.js'; // For weapon types

export const characterDesignProperties = {
    isMoving: false,
    walkCycleFrame: 0,
    limbAnimationSpeed: 150, // ms per frame change for walking
    lastLimbFrameChangeTime: 0,

    // Body and Limbs
    bodyColor: '#3F3', 
    limbColor: '#2A2',
    armLength: 0,
    legLength: 0,
    headRadius: 0,

    // Weapon holding visuals
    weaponAngle: 0, // For aiming or swinging, controlled by animation
    lastAttackAnimationTime: 0,
    attackAnimationDuration: 300, 
    isAttacking: false,
    facingDirection: 1, // 1 for right, -1 for left. Set by playerCore based on input.
    lastDeltaX: 0, // Raw dx input from last movement, set by playerCore. Potentially for finer anim control.
};

export function initCharacterDesign() {
    // 'this' refers to the player object
    this.isMoving = false;
    this.walkCycleFrame = 0;
    this.lastLimbFrameChangeTime = 0;

    this.bodyColor = this.color || characterDesignProperties.bodyColor;
    this.limbColor = characterDesignProperties.limbColor;

    this.headRadius = this.height * 0.18;
    this.armLength = this.height * 0.35;
    this.legLength = this.height * 0.45;

    this.weaponAngle = 0;
    this.lastAttackAnimationTime = 0;
    this.isAttacking = false;
    this.facingDirection = 1; // Default, will be updated by input handler
    this.lastDeltaX = 0;
}

export function updateCharacterAnimation(deltaTime) {
    // 'this' refers to the player object.
    // `this.facingDirection` and `this.isMoving` are set by playerCore.handleInputMovement.
    const now = Date.now();

    // Walking animation
    if (this.isMoving) {
        if (now - this.lastLimbFrameChangeTime > this.limbAnimationSpeed) {
            this.walkCycleFrame = (this.walkCycleFrame + 1) % 4; // 0, 1, 2, 3
            this.lastLimbFrameChangeTime = now;
        }
    } else {
        this.walkCycleFrame = 0; // Idle standing frame
    }

    // Attack animation
    if (this.isAttacking) {
        const elapsed = now - this.lastAttackAnimationTime;
        if (elapsed > this.attackAnimationDuration) {
            this.isAttacking = false;
            this.weaponAngle = 0; // Reset dynamic angle
        } else {
            const progress = elapsed / this.attackAnimationDuration;
            if (this.equippedWeapon && this.equippedWeapon.type === PWeapons.weaponTypes.MELEE) {
                if (progress < 0.1) { 
                    this.weaponAngle = -0.4 * this.facingDirection;
                } else if (progress < 0.7) { 
                    this.weaponAngle = Math.sin((progress - 0.1) / 0.6 * Math.PI) * 1.2 * this.facingDirection;
                } else { 
                     this.weaponAngle = Math.sin(Math.PI) * 1.2 * this.facingDirection * (1 - (progress - 0.7)/0.3);
                }
            } else if (this.equippedWeapon && this.equippedWeapon.type === PWeapons.weaponTypes.RANGED) {
                const recoilMagnitude = -0.3 * this.facingDirection; 
                this.weaponAngle = recoilMagnitude * Math.sin(progress * Math.PI * 2) * (1 - progress); 
            } else { // Unarmed
                 if (progress < 0.2) this.weaponAngle = -0.3 * this.facingDirection;
                 else if (progress < 0.6) this.weaponAngle = Math.sin((progress - 0.2) / 0.4 * Math.PI) * 0.5 * this.facingDirection;
                 else this.weaponAngle = 0;
            }
        }
    }
}

export function startAttackAnimation() {
    // 'this' refers to the player object
    this.isAttacking = true;
    this.lastAttackAnimationTime = Date.now();
    // this.weaponAngle will be animated by updateCharacterAnimation
}


export function renderCharacterDetails(ctx) {
    // 'this' refers to the player object
    ctx.save();
    ctx.strokeStyle = this.limbColor;
    ctx.lineWidth = Math.max(2, this.width * 0.1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const playerCenterX = this.x + this.width / 2;
    const playerBaseY = this.y + this.height; 

    const torsoHeight = this.height * 0.45;
    const torsoWidth = this.width * 0.4;
    const torsoX = playerCenterX - (torsoWidth / 2);
    const torsoY = this.y + this.height * 0.25;

    ctx.fillStyle = this.color; 
    ctx.beginPath();
    ctx.rect(torsoX, torsoY, torsoWidth, torsoHeight);
    ctx.fill();

    const headX = playerCenterX;
    const headY = torsoY - this.headRadius * 0.8; 
    ctx.beginPath();
    ctx.arc(headX, headY, this.headRadius, 0, Math.PI * 2);
    ctx.fill(); 

    const walkCycleOffsets = [
        { arm: 0, leg: 0 },        
        { arm: 0.5, leg: 0.7 },  
        { arm: 0, leg: 0 },        
        { arm: -0.5, leg: -0.7 }  
    ];
    const currentFrameOffsets = this.isMoving ? walkCycleOffsets[this.walkCycleFrame] : walkCycleOffsets[0];


    const hipXOffset = torsoWidth * 0.25 * this.facingDirection; 
    const hipY = torsoY + torsoHeight * 0.9; 

    const leftLegAngle = (this.facingDirection === 1 ? currentFrameOffsets.leg : -currentFrameOffsets.leg) * 0.5; 
    const leftKneeX = playerCenterX - hipXOffset + Math.sin(leftLegAngle) * (this.legLength / 2);
    const leftKneeY = hipY + Math.cos(leftLegAngle) * (this.legLength / 2);
    const leftFootX = leftKneeX + Math.sin(leftLegAngle * 0.8) * (this.legLength / 2); 
    const leftFootY = leftKneeY + Math.cos(leftLegAngle * 0.8) * (this.legLength / 2);

    ctx.beginPath();
    ctx.moveTo(playerCenterX - hipXOffset, hipY);
    ctx.lineTo(leftKneeX, leftKneeY);
    ctx.lineTo(leftFootX, leftFootY);
    ctx.stroke();

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

    const shoulderXOffset = torsoWidth * 0.3 * this.facingDirection;
    const shoulderY = torsoY + torsoHeight * 0.2;

    let frontArmBaseAngle; // Angle for the upper arm segment relative to player's rightward horizontal (0 = arm points right)
    let backArmBaseAngle;  // Same for back arm

    if (this.isAttacking) {
        frontArmBaseAngle = this.weaponAngle; // Attack animation angle drives the front arm
        // Back arm during attack: less swing or counter-motion
        backArmBaseAngle = (this.facingDirection === 1 ? -currentFrameOffsets.arm : currentFrameOffsets.arm) * 0.2; 
    } else { // Not attacking
        if (this.equippedWeapon && this.equippedWeapon.type === PWeapons.weaponTypes.RANGED) {
            // Ranged weapon ready stance: front arm aims slightly up/forward
            // In current arm drawing context (0 angle = arm segment points right):
            // An angle like -0.15 or -0.2 makes the arm point forward and slightly up from shoulder
            frontArmBaseAngle = -0.15 * this.facingDirection; 
        } else {
            // Melee/Unarmed non-attacking: use walk cycle or idle pose
            frontArmBaseAngle = (this.facingDirection === 1 ? currentFrameOffsets.arm : -currentFrameOffsets.arm) * 0.6;
        }
        backArmBaseAngle = (this.facingDirection === 1 ? -currentFrameOffsets.arm : currentFrameOffsets.arm) * 0.6;
        
        if (!this.isMoving && !(this.equippedWeapon && this.equippedWeapon.type === PWeapons.weaponTypes.RANGED)) {
            // Idle, unarmed or melee: arms hang down more naturally
            // (Angle PI/2 points down in arm coord system)
            frontArmBaseAngle = Math.PI / 2 * 0.7; 
            backArmBaseAngle = Math.PI / 2 * 0.7;
        }
    }
    
    // Angles for drawing arm segments (0 means segment extends to player's right, -PI/2 up, PI/2 down)
    // These baseAngles are relative to the fixed "0 = player's right" orientation.
    // The "facingDirection" in the base angle itself helps align it if the angle definition expects that.
    // E.g. weaponAngle already factors in facingDirection.

    const frontShoulderX = playerCenterX + shoulderXOffset;
    const frontElbowX = frontShoulderX + Math.cos(frontArmBaseAngle - Math.PI/2) * (this.armLength / 2);
    const frontElbowY = shoulderY + Math.sin(frontArmBaseAngle - Math.PI/2) * (this.armLength / 2);

    let frontHandAngle = frontArmBaseAngle; // Default lower arm follows upper arm
    if(this.equippedWeapon && this.isAttacking) {
        if (this.equippedWeapon.type === PWeapons.weaponTypes.MELEE) {
            frontHandAngle = this.weaponAngle; // Hand/weapon follows the animated weaponAngle
        } else if (this.equippedWeapon.type === PWeapons.weaponTypes.RANGED) {
            // For ranged recoil, the hand might also be affected by this.weaponAngle
            frontHandAngle = frontArmBaseAngle * 0.3 + this.weaponAngle * 0.7; // Mix base arm pose with recoil
        }
    }

    const frontHandX = frontElbowX + Math.cos(frontHandAngle - Math.PI/2) * (this.armLength / 2);
    const frontHandY = frontElbowY + Math.sin(frontHandAngle - Math.PI/2) * (this.armLength / 2);

    ctx.beginPath();
    ctx.moveTo(frontShoulderX, shoulderY);
    ctx.lineTo(frontElbowX, frontElbowY);
    ctx.lineTo(frontHandX, frontHandY);
    ctx.stroke();

    const backShoulderX = playerCenterX - shoulderXOffset;
    const backElbowX = backShoulderX + Math.cos(backArmBaseAngle - Math.PI / 2) * (this.armLength / 2);
    const backElbowY = shoulderY + Math.sin(backArmBaseAngle - Math.PI / 2) * (this.armLength / 2);
    // Back hand, simple follow-through
    const backHandX = backElbowX + Math.cos(backArmBaseAngle * 0.8 - Math.PI / 2) * (this.armLength / 2); 
    const backHandY = backElbowY + Math.sin(backArmBaseAngle * 0.8 - Math.PI / 2) * (this.armLength / 2);

    ctx.beginPath();
    ctx.moveTo(backShoulderX, shoulderY);
    ctx.lineTo(backElbowX, backElbowY);
    ctx.lineTo(backHandX, backHandY);
    ctx.stroke();

    if (this.equippedWeapon && this.equippedWeapon.char) {
        ctx.fillStyle = this.equippedWeapon.color || '#AAA'; // Weapon color or default
        ctx.font = `${this.height * (this.equippedWeapon.type === PWeapons.weaponTypes.RANGED ? 0.5 : 0.7)}px Monospace`;
        
        ctx.save();
        ctx.translate(frontHandX, frontHandY);

        let finalWeaponRotation = 0;
        // this.weaponAngle is the dynamic animation (swing, recoil)
        // It already incorporates facingDirection.

        if (this.equippedWeapon.type === PWeapons.weaponTypes.MELEE) {
            // For melee chars like '|' or '†', add PI/2 to orient them along the swing.
            // this.weaponAngle provides the swing direction.
            finalWeaponRotation = this.weaponAngle + (Math.PI / 2 * this.facingDirection);
             // If char is like '--' or 'T', it might need different base orientation.
            if (this.equippedWeapon.char === '-' || this.equippedWeapon.char === 'T' || this.equippedWeapon.char === '▋') {
                 finalWeaponRotation = this.weaponAngle + (this.facingDirection === -1 ? Math.PI : 0); // Horizontal flip
            }
        } else if (this.equippedWeapon.type === PWeapons.weaponTypes.RANGED) {
            // Ranged weapons: base aim is player's facingDirection. Recoil is this.weaponAngle.
            // Most font chars for guns (¬, =) point right. Flip if facing left.
            let baseAimRotation = (this.facingDirection === -1) ? Math.PI : 0;
            finalWeaponRotation = baseAimRotation + this.weaponAngle;
        } else { // Unarmed - this.weaponAngle is the punch motion
            finalWeaponRotation = this.weaponAngle;
        }
        
        ctx.rotate(finalWeaponRotation);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.equippedWeapon.char, 0, 0); 
        ctx.restore(); 
    }
    ctx.restore(); 
}