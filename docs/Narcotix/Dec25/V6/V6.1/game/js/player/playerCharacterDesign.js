// js/player/playerCharacterDesign.js
import { drawExpression } from '../utils.js'; // Import drawExpression

export const characterDesignProperties = {
    isMoving: false,
    walkCycleFrame: 0,
    legAnimationTimer: 0,
    legAnimationSpeed: 100, // Speed of leg oscillation

    // Visuals
    bodyColor: '#3F3', 
    headRadius: 0,
    
    facingDirection: 1, // 1 or -1 (Left/Right)
    aimAngle: 0, // Injected from playerCore
    
    // Weapon Animation
    recoilOffset: 0,
    isAttacking: false,
    attackTimer: 0,
    attackDuration: 150, // Fast recoil for guns
    
    renderScale: 1.0, // Global render scale
};

export function initCharacterDesign() {
    this.isMoving = false;
    this.walkCycleFrame = 0;
    this.legAnimationTimer = 0;

    this.bodyColor = this.color || characterDesignProperties.bodyColor;
    this.headRadius = (this.width / 2) * 0.9; 

    this.facingDirection = 1; 
    this.recoilOffset = 0;
    this.isAttacking = false;
    this.renderScale = 1.0;
}

export function updateCharacterAnimation(deltaTime) {
    const now = Date.now();

    // 1. Walk Cycle
    if (this.isMoving) {
        if (now - this.legAnimationTimer > this.legAnimationSpeed) {
            this.walkCycleFrame = (this.walkCycleFrame + 1) % 2; 
            this.legAnimationTimer = now;
        }
    } else {
        this.walkCycleFrame = 0;
    }

    // 2. Weapon Recoil / Attack Animation
    if (this.isAttacking) {
        const elapsed = now - this.attackTimer;
        if (elapsed > this.attackDuration) {
            this.isAttacking = false;
            this.recoilOffset = 0;
        } else {
            // Kick back then return
            // Progress 0 -> 1
            const p = elapsed / this.attackDuration;
            // Recoil kick: Sine wave half cycle?
            // Or linear kick back, slow return.
            if (p < 0.2) {
                // Kick back
                this.recoilOffset = -10 * (p / 0.2); 
            } else {
                // Return
                this.recoilOffset = -10 * (1 - (p - 0.2)/0.8);
            }
        }
    } else {
        this.recoilOffset = 0;
    }
}

export function startAttackAnimation() {
    this.isAttacking = true;
    this.attackTimer = Date.now();
}

/**
 * Render - Top Down Style
 */
export function renderCharacterDetails(ctx) {
    ctx.save();
    
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    // Apply global render scale for Shape Shifting
    if (this.renderScale !== 1.0) {
        ctx.translate(cx, cy);
        ctx.scale(this.renderScale, this.renderScale);
        ctx.translate(-cx, -cy);
    }

    // 1. DYNAMIC LEGS (Oriented to movement if possible, or just below)
    if (this.isMoving) {
        ctx.strokeStyle = '#1e5e1e'; 
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        // Legs appear at back of movement? 
        // Or just sides relative to aim?
        // Let's stick to "sides of body relative to aim"
        const legAngleL = this.aimAngle - Math.PI / 2;
        const legAngleR = this.aimAngle + Math.PI / 2;
        const legDist = this.headRadius * 0.5;
        const legLen = this.headRadius * 0.7; // Extended length

        // Alternate extension
        const extL = (this.walkCycleFrame === 0) ? legLen : legLen * 0.2;
        const extR = (this.walkCycleFrame === 1) ? legLen : legLen * 0.2;

        // Calculate bases
        const lx = cx + Math.cos(legAngleL) * legDist;
        const ly = cy + Math.sin(legAngleL) * legDist;
        const rx = cx + Math.cos(legAngleR) * legDist;
        const ry = cy + Math.sin(legAngleR) * legDist;

        // Draw "Backwards" from movement? Or just out?
        // Top down walking usually legs move parallel to direction.
        // Let's draw lines parallel to Aim Angle but offset by animation.
        // Actually, legs move back and forth.
        
        // Draw Left Leg
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + Math.cos(this.aimAngle + Math.PI) * extL, ly + Math.sin(this.aimAngle + Math.PI) * extL); // Trailing leg
        ctx.stroke();

        // Draw Right Leg
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + Math.cos(this.aimAngle + Math.PI) * extR, ry + Math.sin(this.aimAngle + Math.PI) * extR);
        ctx.stroke();
    }

    // 2. BODY / SHOULDERS
    ctx.fillStyle = '#2A2'; 
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.aimAngle); // Rotate body to face aim
    ctx.beginPath();
    // Oval elongated slightly along Y axis (shoulders width)
    ctx.ellipse(0, 0, this.headRadius * 0.8, this.headRadius * 1.1, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();


    // 3. HEAD (Main Circle)
    ctx.fillStyle = this.color; 
    ctx.beginPath();
    ctx.arc(cx, cy, this.headRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();


    // 4. FACE EXPRESSION
    if (this.faceExpression) {
        // We want the face to rotate with aim? 
        // Top down view: Face is on "top" looking "forward".
        // So we should rotate the canvas to match aimAngle so the face points towards mouse.
        ctx.save();
        ctx.translate(cx, cy);
        
        // Rotate to aim angle.
        // Expression logic draws upright (0 rotation).
        // Aim Angle 0 = Right. PI/2 = Down.
        // If we aim right (0), we want face upright relative to screen? 
        // No, we want face to look right.
        // DrawExpression draws text "XO" upright.
        // We need to rotate context by `this.aimAngle + PI/2` (so top of head points to aim)?
        // Or just `this.aimAngle`?
        // If aim is Right (0): We want top of head at Left? No.
        // Top-down: Face is "painted on top of ball".
        // If I look Right, the "Eyes" should align with Y axis?
        // Let's assume standard orientation: Up is "Top of Head".
        // If looking Right, "Top of Head" is Left (-X)? No.
        
        // Let's just rotate it so the text aligns with the aim vector.
        // Text baseline is horizontal.
        // Aim vector is `this.aimAngle`.
        // We want text to be readable? Or oriented to player?
        // "Top Down" usually means we see the top of head.
        // Maybe the face shouldn't rotate? 
        // "Expression can still be drawn as is on top of head" - usually implies screen-upright.
        // Let's keep it screen-upright for readability, regardless of rotation.
        // BUT, if player rotates, does head rotate?
        // Let's keep face upright relative to SCREEN for now.
        
        const fSize = this.headRadius * 1.6;
        // Centered upright
        drawExpression(ctx, -fSize/2, -fSize/2, fSize, fSize, this.faceExpression);
        ctx.restore();
    }


    // 5. WEAPON (Floating / Aiming)
    if (this.equippedWeapon && this.equippedWeapon.char) {
        // Offset from center based on aimAngle + offset to side (right hand)
        // Right Hand offset angle = aimAngle + PI/2? No, + PI/4?
        // Hand position: Forward and Right.
        
        const sideOffset = this.headRadius * 0.8;
        const fwdOffset = this.headRadius * 0.8 + this.recoilOffset; // Apply recoil (negative moves back)

        // Calculate Weapon Pos
        // Move Fwd, then Move Right (relative to aim)
        const wx = cx + Math.cos(this.aimAngle) * fwdOffset + Math.cos(this.aimAngle + Math.PI/2) * sideOffset;
        const wy = cy + Math.sin(this.aimAngle) * fwdOffset + Math.sin(this.aimAngle + Math.PI/2) * sideOffset;

        ctx.fillStyle = this.equippedWeapon.color || '#CCC';
        ctx.font = `${this.height * 0.6}px Monospace`; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(this.aimAngle); // Rotate weapon to point to aim
        
        // Check flipping if aim is Left-ish?
        if (Math.abs(this.aimAngle) > Math.PI / 2) {
             ctx.scale(1, -1); // Flip Y to keep text upright-ish
        }

        ctx.fillText(this.equippedWeapon.char, 0, 0);
        ctx.restore();
    }

    ctx.restore();
}