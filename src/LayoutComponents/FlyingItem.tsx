import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
    x: number;
    y: number;
    image: string;
    onComplete: () => void;
}

const FlyingItem: React.FC<Props> = ({ x, y, image, onComplete }) => {
    const [target, setTarget] = useState({ x: window.innerWidth - 60, y: 40 });

    useEffect(() => {
        const cartElement = document.getElementById('cart-icon-target');
        if (cartElement) {
            const rect = cartElement.getBoundingClientRect();
            setTarget({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            });
        }
    }, []);

    return (
        <motion.div
            initial={{ 
                top: y - 24, 
                left: x - 24, 
                opacity: 0, 
                scale: 0.5, 
                position: 'fixed' 
            }}
            animate={{ 
                // Stage 1: Pop out and start arc
                // Stage 2: Zoom to target and disappear
                top: [y - 24, y - 150, target.y], // Arcs upward before diving
                left: [x - 24, (x + target.x) / 2, target.x], 
                opacity: [1, 1, 0],
                scale: [1, 1.2, 0], // Grows slightly then shrinks to nothing
                rotate: [0, 180, 720]
            }}
            transition={{ 
                duration: 1.2, // Lasts longer as requested
                ease: "easeInOut",
                times: [0, 0.4, 1] // Timing for the arc stages
            }}
            onAnimationComplete={onComplete}
            style={{ pointerEvents: 'none', zIndex: 9999 }}
        >
            <div className="relative">
                {/* The Product Image */}
                <div className="w-16 h-16 rounded-full border-4 border-indigo-600 overflow-hidden shadow-2xl bg-white">
                    <img src={image} className="w-full h-full object-cover" alt="flying-item" />
                </div>
                
                {/* Trailing "Ghost" effects */}
                <div className="absolute inset-0 w-full h-full rounded-full bg-indigo-400/30 animate-ping blur-sm" />
            </div>
        </motion.div>
    );
};

export default FlyingItem;