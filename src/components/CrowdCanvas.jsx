import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

const CrowdCanvas = ({ src, rows = 15, cols = 7, peepColor = "#000000", className }) => {
  const canvasRef = useRef(null);
  const colorRef = useRef(peepColor);
  const tintImageRef = useRef(null);

  useEffect(() => {
    colorRef.current = peepColor;
    if (tintImageRef.current) {
      tintImageRef.current(peepColor);
    }
  }, [peepColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const config = { src, rows, cols };

    // UTILS
    const randomRange = (min, max) => min + Math.random() * (max - min);
    const randomIndex = (array) => randomRange(0, array.length) | 0;
    const removeFromArray = (array, i) => array.splice(i, 1)[0];
    const removeItemFromArray = (array, item) => removeFromArray(array, array.indexOf(item));
    const removeRandomFromArray = (array) => removeFromArray(array, randomIndex(array));
    const getRandomFromArray = (array) => array[randomIndex(array) | 0];

    // TWEEN FACTORIES
    const resetPeep = ({ stage, peep }) => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      const offsetY = 100 - 250 * gsap.parseEase("power2.in")(Math.random());
      const startY = stage.height - peep.height + offsetY;
      let startX, endX;

      if (direction === 1) {
        startX = -peep.width;
        endX = stage.width;
        peep.scaleX = 1;
      } else {
        startX = stage.width + peep.width;
        endX = 0;
        peep.scaleX = -1;
      }
      peep.x = startX;
      peep.y = startY;
      peep.anchorY = startY;
      return { startX, startY, endX };
    };

    const normalWalk = ({ peep, props }) => {
      const { startX, startY, endX } = props;
      const xDuration = 10;
      const yDuration = 0.25;

      const tl = gsap.timeline();
      tl.timeScale(randomRange(0.5, 1.5));
      tl.to(peep, { duration: xDuration, x: endX, ease: "none" }, 0);
      tl.to(peep, { duration: yDuration, repeat: xDuration / yDuration, yoyo: true, y: startY - 10 }, 0);
      return tl;
    };

    const walks = [normalWalk];

    const createPeep = ({ image, rect }) => {
      const peep = {
        image,
        rect: [],
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        anchorY: 0,
        scaleX: 1,
        walk: null,
        setRect: (r) => {
          peep.rect = r;
          peep.width = r[2];
          peep.height = r[3];
        },
        render: (ctx) => {
          ctx.save();
          ctx.translate(peep.x, peep.y);
          ctx.scale(peep.scaleX, 1);
          ctx.drawImage(peep.image, peep.rect[0], peep.rect[1], peep.rect[2], peep.rect[3], 0, 0, peep.width, peep.height);
          ctx.restore();
        },
      };
      peep.setRect(rect);
      return peep;
    };

    const img = document.createElement("img");
    const stage = { width: 0, height: 0 };
    const allPeeps = [];
    const availablePeeps = [];
    const crowd = [];

    const createPeeps = () => {
      const { rows, cols } = config;
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const total = rows * cols;
      const rectWidth = width / rows;
      const rectHeight = height / cols;

      for (let i = 0; i < total; i++) {
        allPeeps.push(createPeep({
          image: img,
          rect: [(i % rows) * rectWidth, ((i / rows) | 0) * rectHeight, rectWidth, rectHeight],
        }));
      }
    };

    const initCrowd = () => {
      while (availablePeeps.length) {
        addPeepToCrowd().walk.progress(Math.random());
      }
    };

    const addPeepToCrowd = () => {
      const peep = removeRandomFromArray(availablePeeps);
      const walk = getRandomFromArray(walks)({ peep, props: resetPeep({ peep, stage }) })
        .eventCallback("onComplete", () => {
          removePeepFromCrowd(peep);
          addPeepToCrowd();
        });
      peep.walk = walk;
      crowd.push(peep);
      crowd.sort((a, b) => a.anchorY - b.anchorY);
      return peep;
    };

    const removePeepFromCrowd = (peep) => {
      removeItemFromArray(crowd, peep);
      availablePeeps.push(peep);
    };

    const render = () => {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      crowd.forEach((peep) => peep.render(ctx));
    };

    const resize = () => {
      if (!canvas) return;
      const { width, height } = canvas.getBoundingClientRect();
      // Increase pixel ratio for sharper image
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      stage.width = canvas.width;
      stage.height = canvas.height;
      
      ctx.scale(dpr, dpr);
      
      crowd.forEach((peep) => {
        peep.walk.kill();
      });
      crowd.length = 0;
      availablePeeps.length = 0;
      availablePeeps.push(...allPeeps);
      
      initCrowd();
    };

    // Color Tinting logic
    tintImageRef.current = (color) => {
      // For simplicity, we just use the original image in this implementation
      // as creating a robust tinted version of a sprite sheet requires more advanced canvas manipulation
      // which might be slow in a render loop.
    };

    img.onload = () => {
      createPeeps();
      availablePeeps.push(...allPeeps);
      resize();
      
      gsap.ticker.add(render);
      window.addEventListener("resize", resize);
    };
    
    img.src = config.src;

    return () => {
      gsap.ticker.remove(render);
      window.removeEventListener("resize", resize);
      crowd.forEach(p => {
        if(p.walk) p.walk.kill();
      });
    };
  }, [src, rows, cols]);

  return (
    <div className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
      />
    </div>
  );
};

export default CrowdCanvas;
