# dpp-mining-web
A web version and solver of the mining game found in the sinnoh underground in Pokémon Diamond, Pearl, and Platinum.

### Todo:
- [x] All available objects
- [x] Object distribution
- [x] Object Rarity in pool
- [x] Small and large hammer
- [x] Buttons for small and large hammer
- [x] Screen shake
- [x] Health bar
- [x] Effect for hammers, hitting with big, hitting with small, and hitting bedrock
- [x] Animations for hammer
- [~] Unearthing object
- [~] Listing objects unearthed
- [~] Announcing objects found (initial ping)
- [ ] Sound effects?
- [ ] Collection
    - [ ] Singleton collection, for plates
- [ ] Version difference?

Various ideas:
- [~] Options for turning off sound, screen shake
- [ ] Calculated version difference based on IP or other user Identifier
- [~] Free play
- [ ] Solver (find optimal moves)
- [ ] In-depth research about original game
- [ ] Web page styling (favicon, embedding image)

### Notes

#### Animation

Hammers both have the same three kinds of animations
- Hitting terrain
- Hitting a revealed item
- Hitting revealed bedrock

The animation of the hammer object itself is always the same
- Hammer Hit
1. Tilt at upper position
2. Tilt at lower position
3. Tilt at lower position
4. Regular at upper position
5. Regular at upper position
6. Regular at upper position + 1 pixel right
7. Regular at upper position + 1 pixel right
8. Regular at upper position
9. Regular at upper position
10. Regular at upper position + 1 pixel right
11. Regular at upper position + 1 pixel right

But the sparks are different

- Hitting Terrain: 
1. Regular Spark
2. Nothing
3. Regular Spark
4. Nothing
5. Regular Spark

- Hitting a revealed item
1. Spark with small star
2. Small star
3. Spark with broken star
4. Nothing
5. Regular spark

- Hitting bedrock
1. "Whiff" spark
2. Nothing
3. "Whiff" spark
4. Nothing
5. "Whiff" spark

### Credits

The FontStruction “Pokémon DP Pro” (https://fontstruct.com/fontstructions/show/404271) by “crystalwalrein” is licensed under a Creative Commons Attribution Share Alike license (http://creativecommons.org/licenses/by-sa/3.0/).