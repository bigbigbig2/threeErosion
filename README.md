# Three.js Terrain Erosion Simulation

Real-time terrain erosion simulation built with Three.js and WebGL2, migrated and refactored from the original WebGL project.

## Original Project

This project is migrated from [Webgl-Erosion](https://github.com/lanlou123/Webgl-Erosion), rewritten using Three.js instead of raw WebGL, with TypeScript for better maintainability and developer experience.



## Screenshots

![image-20251214144215971](README.assets/image-20251214144215971.png)

![image-20251214144233981](README.assets/image-20251214144233981.png)

![image-20251214144312452](README.assets/image-20251214144312452.png)

![image-20251214144346864](README.assets/image-20251214144346864.png)

## Features

- Pipe-model based hydraulic erosion simulation
- Thermal erosion (landslide) simulation
- Sediment transport and deposition
- MacCormack advection scheme
- Real-time brush editing (terrain/water)
- Multiple terrain generation modes (FBM, Domain Warping, Terrace, Voronoi)
- Various debug views (sediment, velocity field, flux, etc.)

## Tech Stack

- Three.js + WebGL2
- TypeScript
- Vite
- dat.GUI

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Controls

- Left mouse drag: Rotate camera
- Right mouse drag: Pan camera
- Mouse wheel: Zoom
- Shift + Left click: Brush painting
- GUI panel: Adjust simulation parameters

## References

- [Fast Hydraulic Erosion Simulation and Visualization on GPU](http://www-ljk.imag.fr/Publications/Basilic/com.lmc.publi.PUBLI_Inproceedings@117681e94b6_fff75c/FastErosion_PG07.pdf)
- [Interactive Terrain Modeling Using Hydraulic Erosion](https://cgg.mff.cuni.cz/~jaroslav/papers/2008-sca-erosim/2008-sca-erosiom-fin.pdf)
- ShaderX7 Advanced Rendering Techniques

## License

MIT
