import React, { useRef, useEffect, useState } from 'react';

const PacmanGame = () => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [lives, setLives] = useState(3); // Pour les vies
const [gameOver, setGameOver] = useState(false); // Pour l'état de fin de jeu
const [initialPellets, setInitialPellets] = useState([]);
const [resetGame, setResetGame] = useState(false);
const [username, setUsername] = useState('');
const [playerData, setPlayerData] = useState(null);
const [showForm, setShowForm] = useState(true);
const [errorMessage, setErrorMessage] = useState('');
const [lastScore,setLastScore] = useState(0);

useEffect(() => {
  const fetchLastScore = async () => {
    if (playerData) {
      try {
        const response = await fetch(`http://localhost:4000/games/${playerData.id}`);
        if (response.ok) {
          const data = await response.json();
          console.log("Dernier score récupéré:", data);
          setLastScore(data.score);
        } else {
          console.error("Erreur lors de la récupération des scores");
        }
      } catch (error) {
        console.error("Erreur réseau :", error);
      }
    }
  };

  fetchLastScore();
}, [playerData]);


const saveScoreToDatabase = async () => {
  if (!playerData || !gameOver) return;
  
  try {
    // Préparer les données à envoyer
    const gameData = {
      player_id: playerData.id,
      score: score
    };
    
    // Envoyer les données au backend
    const response = await fetch('http://localhost:4000/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gameData),
    });
    
    if (response.ok) {
      console.log('Score sauvegardé avec succès!');
    } else {
      console.error('Erreur lors de la sauvegarde du score');
    }
  } catch (error) {
    console.error('Erreur de connexion:', error);
  }
};

useEffect(() => {
  if (gameOver && playerData) {
    saveScoreToDatabase();
  }
}, [gameOver, playerData]);

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!username.trim()) {
    setErrorMessage("Veuillez entrer un nom d'utilisateur");
    return;
  }
  
  try {
    // D'abord, essayons de récupérer le joueur par son nom
    const response = await fetch(`http://localhost:4000/players/${username}`);
    
    if (response.status === 200) {
      // Le joueur existe déjà
      const data = await response.json();
      setPlayerData(data);
      setShowForm(false);
    } else if (response.status === 404) {
      // Le joueur n'existe pas, il faut le créer
      try {
        const createResponse = await fetch('http://localhost:4000/players', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: username }),
        });
        
        if (createResponse.ok) {
          const newPlayer = await createResponse.json();
          setPlayerData(newPlayer);
          setShowForm(false);
        } else {
          const errorData = await createResponse.json();
          setErrorMessage(`Erreur lors de la création du joueur: ${errorData.message || 'Erreur inconnue'}`);
        }
      } catch (createError) {
        console.error("Erreur lors de la création:", createError);
        setErrorMessage("Erreur lors de la création du joueur");
      }
    } else {
      setErrorMessage(`Erreur inattendue: ${response.status}`);
    }
  } catch (error) {
    console.error("Erreur de connexion:", error);
    setErrorMessage("Erreur de connexion au serveur");
  }
};

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return; 
    const ctx = canvas.getContext('2d');

    // Ajuster la taille du canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLS = 21;
    const ROWS = 23;
    

 
    // Classe Node pour l'algorithme A*
    class Node {

      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.walkable = true;
        this.g = 0;
        this.h = 0;
        this.f = 0;
        this.parent = null;
      }
    }

    const grid = Array.from({ length: ROWS }, (_, y) =>
      Array.from({ length: COLS }, (_, x) => new Node(x, y))
    );

    function getNeighbors(node, grid) {
      const dirs = [
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 }
      ];
      const neighbors = [];
      for (let d of dirs) {
        const nx = node.x + d.x;
        const ny = node.y + d.y;
        if (grid[ny] && grid[ny][nx]) {
          neighbors.push(grid[ny][nx]);
        }
      }
      return neighbors;
    }

    function heuristic(a, b) {
      if (!a || !b) return 0; // Si un des nœuds est undefined ou null, renvoyer 0
      return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); // Manhattan
    }

    function aStar(start, end, grid) {
      if (!start || !end) return [];
      for (let row of grid) {
        for (let node of row) {
          node.g = 0;
          node.h = 0;
          node.f = 0;
          node.parent = null;
        }
      }

      const openSet = [start];
      const closedSet = [];

      while (openSet.length > 0) {
        let current = openSet.reduce((a, b) => (a.f < b.f ? a : b));

        if (current === end) {
          const path = [];
          let temp = current;
          while (temp) {
            path.push(temp);
            temp = temp.parent;
          }
          return path.reverse();
        }

        openSet.splice(openSet.indexOf(current), 1);
        closedSet.push(current);

        const neighbors = getNeighbors(current, grid);
        for (let neighbor of neighbors) {
          if (!neighbor.walkable || closedSet.includes(neighbor)) continue;

          const tentativeG = current.g + 1;

          if (!openSet.includes(neighbor)) openSet.push(neighbor);
          else if (tentativeG >= neighbor.g) continue;

          neighbor.g = tentativeG;
          neighbor.h = heuristic(neighbor, end);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;
        }
      }

      return [];
    }

    class Boundary {
      static WIDTH = 20;
      static HEIGHT = 20;
      constructor({ position }) {
        this.position = position;
        this.width = 20;
        this.height = 20;
        this.wallSpaceWidth = this.width / 1.6;
        this.wallOffset = (this.width - this.wallSpaceWidth) / 2;
        this.wallInnerColor = "black";
      }

    
      draw() {
        // Dessiner le fond du mur en bleu
        ctx.fillStyle = "#342DCA"; // Couleur bleue spécifique du premier fichier
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        
        // Vérifier si des murs sont adjacents et dessiner les connexions intérieures noires
        
        // Connexion avec le mur à gauche
        if (
          this.position.x > 0 && 
          boundaries.some(
            b => 
              b.position.x === this.position.x - this.width && 
              b.position.y === this.position.y
          )
        ) {
          ctx.fillStyle = this.wallInnerColor;
          ctx.fillRect(
            this.position.x, 
            this.position.y + this.wallOffset,
            this.wallSpaceWidth + this.wallOffset,
            this.wallSpaceWidth
          );
        }
        
        // Connexion avec le mur à droite
        if (
          boundaries.some(
            b => 
              b.position.x === this.position.x + this.width && 
              b.position.y === this.position.y
          )
        ) {
          ctx.fillStyle = this.wallInnerColor;
          ctx.fillRect(
            this.position.x + this.wallOffset,
            this.position.y + this.wallOffset,
            this.wallSpaceWidth + this.wallOffset,
            this.wallSpaceWidth
          );
        }
        
        // Connexion avec le mur au-dessus
        if (
          this.position.y > 0 && 
          boundaries.some(
            b => 
              b.position.x === this.position.x && 
              b.position.y === this.position.y - this.height
          )
        ) {
          ctx.fillStyle = this.wallInnerColor;
          ctx.fillRect(
            this.position.x + this.wallOffset,
            this.position.y,
            this.wallSpaceWidth,
            this.wallSpaceWidth + this.wallOffset
          );
        }
        
        // Connexion avec le mur en-dessous
        if (
          boundaries.some(
            b => 
              b.position.x === this.position.x && 
              b.position.y === this.position.y + this.height
          )
        ) {
          ctx.fillStyle = this.wallInnerColor;
          ctx.fillRect(
            this.position.x + this.wallOffset,
            this.position.y + this.wallOffset,
            this.wallSpaceWidth,
            this.wallSpaceWidth + this.wallOffset
          );
        }
      }
    }
    class Player {
      constructor({ position, velocity }) {
        this.position = { ...position };
        this.startPosition = { ...position };  
        this.velocity = velocity;
        this.radius = 6;
      }
      
      resetPosition() {
        this.position.x = this.startPosition.x;
        this.position.y = this.startPosition.y;
        this.velocity.x = 0;
        this.velocity.y = 0;
      }
      
      

      draw() {
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'yellow';
        ctx.fill();
        ctx.closePath();
      }

      update() {
        this.draw();
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
      }

      resetVelocity() {
        this.velocity.x = this.velocity.y = 0;
      }
    }
  

    class Ghost {
      constructor({ position, velocity, color, startNode, endNode, personality }) {
        this.position = position;
        this.initialPosition = { x: position.x, y: position.y };

        this.velocity = velocity;
        this.radius = 6;
        this.color = color;
        this.startNode = startNode;
        this.endNode = endNode;
        this.path = [];
        // Ajouter une personnalité pour chaque fantôme
        this.personality = personality || 'direct'; // 'direct', 'ambush', 'scatter'
      }
    
      getColor() {
        return this.color;
      }
      
      setStartNode(node) {
        this.startNode = node;
      }
      
      setEndNode(node) {
        this.endNode = node;
      }
      
      setPath(path) {
        this.path = path;
      }
    
      draw() {
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
      }
    
      // Méthode pour calculer la cible en fonction de la personnalité
      calculateTarget(pacman, pacLeftRight, pacUpDown) {
        let targetX, targetY;
        
        switch(this.personality) {
          case 'direct': // Le fantôme rouge poursuit directement Pac-Man
            targetX = Math.floor(pacman.position.x / Boundary.WIDTH);
            targetY = Math.floor(pacman.position.y / Boundary.HEIGHT);
            break;
            
          case 'ambush': // Le fantôme bleu vise devant Pac-Man (4 cases)
            // Calculer la position cible en fonction de la direction de Pac-Man
            targetX = Math.floor(pacman.position.x / Boundary.WIDTH) + (pacLeftRight * 4);
            targetY = Math.floor(pacman.position.y / Boundary.HEIGHT) + (pacUpDown * 4);
            
            // Limiter la cible aux limites de la grille
            targetX = Math.max(0, Math.min(targetX, COLS - 1));
            targetY = Math.max(0, Math.min(targetY, ROWS - 1));
            break;
            
          case 'scatter': // Le fantôme rose se disperse dans les coins
            // Le fantôme se dirige vers un coin de la carte selon un pattern de rotation
            const corners = [
              {x: 1, y: 1},                // coin supérieur gauche
              {x: COLS-2, y: 1},           // coin supérieur droit
              {x: 1, y: ROWS-2},           // coin inférieur gauche
              {x: COLS-2, y: ROWS-2}       // coin inférieur droit
            ];
            
            // Changement de coin toutes les 10 secondes environ
            const cornerIndex = Math.floor(Date.now() / 10000) % corners.length;
            targetX = corners[cornerIndex].x;
            targetY = corners[cornerIndex].y;
            
            // Si Pac-Man est trop proche du coin ciblé, changer de coin
            const pacX = Math.floor(pacman.position.x / Boundary.WIDTH);
            const pacY = Math.floor(pacman.position.y / Boundary.HEIGHT);
            if (Math.abs(pacX - targetX) < 5 && Math.abs(pacY - targetY) < 5) {
              const newCornerIndex = (cornerIndex + 1) % corners.length;
              targetX = corners[newCornerIndex].x;
              targetY = corners[newCornerIndex].y;
            }
            break;
            
          case 'patrol': // Pour le fantôme orange, ajout d'un comportement de patrouille
            // Le fantôme orange patrouille entre quelques points spécifiques
            const patrolPoints = [
              {x: 1, y: ROWS/2},           // milieu gauche
              {x: COLS-2, y: ROWS/2},      // milieu droit
              {x: COLS/2, y: 1},           // milieu haut
              {x: COLS/2, y: ROWS-2}       // milieu bas
            ];
            
            // Changement de point toutes les 8 secondes
            const patrolIndex = Math.floor(Date.now() / 8000) % patrolPoints.length;
            targetX = patrolPoints[patrolIndex].x;
            targetY = patrolPoints[patrolIndex].y;
            
            // Si Pacman est trop proche, fuir dans la direction opposée
            const distanceToPacman = Math.sqrt(
              Math.pow(pacX - Math.floor(this.position.x / Boundary.WIDTH), 2) +
              Math.pow(pacY - Math.floor(this.position.y / Boundary.HEIGHT), 2)
            );
            
            if (distanceToPacman < 5) {
              // Fuir dans la direction opposée
              const dx = Math.floor(this.position.x / Boundary.WIDTH) - pacX;
              const dy = Math.floor(this.position.y / Boundary.HEIGHT) - pacY;
              
              // Amplifier le vecteur de fuite
              targetX = Math.floor(this.position.x / Boundary.WIDTH) + (dx * 2);
              targetY = Math.floor(this.position.y / Boundary.HEIGHT) + (dy * 2);
              
              // Limiter aux bordures
              targetX = Math.max(0, Math.min(targetX, COLS - 1));
              targetY = Math.max(0, Math.min(targetY, ROWS - 1));
            }
            break;
            
          default:
            targetX = Math.floor(pacman.position.x / Boundary.WIDTH);
            targetY = Math.floor(pacman.position.y / Boundary.HEIGHT);
        }
        
        return { x: targetX, y: targetY };
      }
      resetPosition() {
        this.position = {
          x: this.initialPosition.x,
          y: this.initialPosition.y
        };
        this.velocity = { x: 0, y: 0 };
      }
      
      
      
      update(pacman, pacLeftRight, pacUpDown, otherGhosts, isColliding) {
        // Si le fantôme est en collision avec Pacman, arrêtez son mouvement
        if (isColliding) {
          this.velocity.x = 0;
          this.velocity.y = 0;
          this.draw();
          return;
        }
        this.draw();
        
        const ghostX = Math.floor(this.position.x / Boundary.WIDTH);
        const ghostY = Math.floor(this.position.y / Boundary.HEIGHT);
        this.startNode = grid[ghostY][ghostX];
        
        // Calculer la cible en fonction de la personnalité
        const target = this.calculateTarget(pacman, pacLeftRight, pacUpDown);
        
        // Vérifier les collisions potentielles avec d'autres fantômes
        
        // Si aucun évitement n'a été effectué, continuer le mouvement normal
          this.endNode = grid[target.y][target.x];
          this.path = aStar(this.startNode, this.endNode, grid);
          
          if (this.path.length > 1) {
            const nextNode = this.path[1];
            const targetX = nextNode.x * Boundary.WIDTH + Boundary.WIDTH / 2;
            const targetY = nextNode.y * Boundary.HEIGHT + Boundary.HEIGHT / 2;
        
            const dx = targetX - this.position.x;
            const dy = targetY - this.position.y;
        
            const distance = Math.sqrt(dx * dx + dy * dy);
        
            if (distance < 1) {
              this.startNode = nextNode;
              this.path.shift();
            } else {
              // Mouvement plus fluide avec normalisation
              // Vitesse différente selon la personnalité du fantôme
              let speed;
              switch(this.personality) {
                case 'direct': speed = 1.1; break;    // Rouge légèrement plus rapide
                case 'ambush': speed = 1.0; break;    // Bleu vitesse normale
                case 'scatter': speed = 0.9; break;   // Rose légèrement plus lent
                case 'patrol': speed = 0.85; break;   // Orange le plus lent
                default: speed = 1.0;
              }
              
              const magnitude = Math.sqrt(dx * dx + dy * dy);
              this.velocity.x = magnitude > 0 ? (dx / magnitude) * speed : 0;
              this.velocity.y = magnitude > 0 ? (dy / magnitude) * speed : 0;
            }
          }
        
        
        // Mise à jour de la position
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
      }
     
      resetVelocity() {
        this.velocity.x = this.velocity.y = 0;
      }
    }

    class Pellet {
      constructor({ position }) {
        this.position = position;
        this.radius = 3;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.closePath();
      }
    }

    const keys = {
      w: { pressed: false },
      s: { pressed: false },
      a: { pressed: false },
      d: { pressed: false }
    };

    const map = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1],
      [1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1],
      [1, 2, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 2, 1],
      [1, 1, 1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 1, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 1, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 3, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2, 2, 2, 2, 1, 3, 3, 3, 1, 2, 2, 2, 2, 2, 2, 2, 2],
      [1, 1, 1, 1, 1, 2, 1, 2, 1, 3, 3, 3, 1, 2, 1, 2, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 1, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1],
      [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1],
      [1, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 1],
      [1, 1, 1, 2, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 2, 1, 1, 1],
      [1, 2, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 2, 1],
      [1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];

    let boundaries = [];
    let pellets = [];
    const ghostArea = [
      [210, 230],
      [190, 230],
      [230, 230],
      [230, 210]
    ];

    let ghosts = [
      new Ghost({
        position: {
          x: ghostArea[0][0],
          y: ghostArea[0][1],
        },
        velocity: {
          x: 0,
          y: 0
        },
        color: 'red',
        personality: 'direct',
        startNode: grid[Math.floor(ghostArea[0][1] / Boundary.HEIGHT)][Math.floor(ghostArea[0][0] / Boundary.WIDTH)]
      }),
      new Ghost({
        position: {
          x: ghostArea[1][0],
          y: ghostArea[1][1],
        },
        velocity: {
          x: 0,
          y: 0
        },
        color: 'blue',
        personality: 'ambush',
        startNode: grid[Math.floor(ghostArea[1][1] / Boundary.HEIGHT)][Math.floor(ghostArea[1][0] / Boundary.WIDTH)]
      }),
      new Ghost({
        position: {
          x: ghostArea[2][0],
          y: ghostArea[2][1],
        },
        velocity: {
          x: 0,
          y: 0
        },
        color: 'pink',
        personality: 'scatter',
        startNode: grid[Math.floor(ghostArea[2][1] / Boundary.HEIGHT)][Math.floor(ghostArea[2][0] / Boundary.WIDTH)]
      }),
      new Ghost({
        position: {
          x: ghostArea[3][0],
          y: ghostArea[3][1],
        },
        velocity: {
          x: 0,
          y: 0
        },
        color: 'orange',
        personality: 'ambush',
        startNode: grid[Math.floor(ghostArea[3][1] / Boundary.HEIGHT)][Math.floor(ghostArea[3][0] / Boundary.WIDTH)]
      })
    ];
    

    const pacman = new Player({
      position: {
        x: Boundary.WIDTH + Boundary.WIDTH / 2,
        y: Boundary.HEIGHT + Boundary.HEIGHT / 2
      },
      velocity: {
        x: 0,
        y: 0
      }
    });

    // Création de la carte
    map.forEach((line, i) => {
      line.forEach((bound, j) => {
        switch (bound) {
          case 1:
            boundaries.push(new Boundary({
              position: {
                x: Boundary.WIDTH * j,
                y: Boundary.HEIGHT * i
              }
            }));
            grid[i][j].walkable = false; // Marquer le nœud comme non traversable
            break;
          case 2:
            pellets.push(new Pellet({
              position: {
                x: Boundary.WIDTH * (j + 1 / 2),
                y: Boundary.HEIGHT * (i + 1 / 2)
              }
            }));
            break;
          default:
            break;
        }
      });
    });
    const initialPelletsArray = JSON.parse(JSON.stringify(pellets));
    setInitialPellets(initialPelletsArray);

    let lastKey;
    let pacUpDown = 0;
    let pacLeftRight = 1;

    function circleRectangleCollision({ circle, rectangle }) {
      return (circle.position.y - circle.radius + circle.velocity.y <= rectangle.position.y + rectangle.height + circle.radius / 2)
        &&
        (circle.position.x - circle.radius + circle.velocity.x <= rectangle.position.x + rectangle.width + circle.radius / 2)
        &&
        (circle.position.y + circle.radius + circle.velocity.y >= rectangle.position.y - circle.radius / 2)
        &&
        (circle.position.x + circle.radius + circle.velocity.x >= rectangle.position.x - circle.radius / 2);
    }

  
    function circleCollision(circle1, circle2) {
      return Math.hypot(
        circle1.position.x - circle2.position.x,
        circle1.position.y - circle2.position.y
      ) < circle1.radius + circle2.radius;
    }
    let ghostCollision = false;

    function animate() {
      const animationId = requestAnimationFrame(animate);
       // Si le jeu est terminé, arrêter l'animation
      if (gameOver) {
        cancelAnimationFrame(animationId);
        return;
      }
      
       ctx.clearRect(0, 0, canvas.width, canvas.height);


      // Logique de mouvement du Pacman basée sur les touches pressées
      if (keys.w.pressed && lastKey === 'w') {
        for (let i = 0; i < boundaries.length; i++) {
          const element = boundaries[i];
          if (
            circleRectangleCollision({
              circle: {
                ...pacman, velocity: {
                  x: 0,
                  y: -2
                }
              },
              rectangle: element
            })
          ) {
            pacman.velocity.y = 0;
            pacUpDown = 0;
            pacLeftRight = 0;
            break;
          } else {
            pacman.velocity.y = -2;
            pacUpDown = -1;
            pacLeftRight = 0;
          }
        }
      }
      else if (keys.s.pressed && lastKey === 's') {
        for (let i = 0; i < boundaries.length; i++) {
          const element = boundaries[i];
          if (
            circleRectangleCollision({
              circle: {
                ...pacman, velocity: {
                  x: 0,
                  y: 2
                }
              },
              rectangle: element
            })
          ) {
            pacman.velocity.y = 0;
            pacUpDown = 0;
            pacLeftRight = 0;
            break;
          } else {
            pacman.velocity.y = 2;
            pacUpDown = 1;
            pacLeftRight = 0;
          }
        }
      }
      else if (keys.a.pressed && lastKey === 'a') {
        for (let i = 0; i < boundaries.length; i++) {
          const element = boundaries[i];
          if (
            circleRectangleCollision({
              circle: {
                ...pacman, velocity: {
                  x: -2,
                  y: 0
                }
              },
              rectangle: element
            })
          ) {
            pacman.velocity.x = 0;
            pacLeftRight = 0;
            break;
          } else {
            pacman.velocity.x = -2;
            pacLeftRight = -1;
            pacUpDown = 0;
          }
        }
      }
      else if (keys.d.pressed && lastKey === 'd') {
        for (let i = 0; i < boundaries.length; i++) {
          const element = boundaries[i];
          if (
            circleRectangleCollision({
              circle: {
                ...pacman, velocity: {
                  x: 2,
                  y: 0
                }
              },
              rectangle: element
            })
          ) {
            pacman.velocity.x = 0;
            pacLeftRight = 0;
            break;
          } else {
            pacman.velocity.x = 2;
            pacLeftRight = 1;
            pacUpDown = 0;
          }
        }
      }

      // Dessiner et gérer les collisions avec les pastilles
      pellets.forEach((pellet, index) => {
        pellet.draw();

        // Vérifier si Pacman mange une pastille
        if (Math.hypot(
          pellet.position.x - pacman.position.x,
          pellet.position.y - pacman.position.y
        ) < pellet.radius + pacman.radius) {
          pellets.splice(index, 1);
          setScore(prevScore => prevScore + 10);
        }
      });

      // Dessiner et gérer les collisions avec les murs
      boundaries.forEach(element => {
        element.draw();
        if (circleRectangleCollision({
          circle: pacman,
          rectangle: element
        })) {
          pacman.resetVelocity();
        }
      });

      // Gestion des tunnels
      if (pacman.position.x >= 420 && Math.abs(pacman.position.y - 210) < 5) {
        pacman.position.x = 10; // Un peu à l'intérieur du tunnel de l'autre côté
      } else if (pacman.position.x <= 10 && Math.abs(pacman.position.y - 210) < 5) {
        pacman.position.x = 420; // Un peu à l'intérieur du tunnel de l'autre côté
      }

      pacman.update();

  // Mise à jour des fantômes
  ghosts.forEach((ghost) => {
    if (!ghostCollision && circleCollision(ghost, pacman)) {
      ghostCollision = true;
      
      // Arrêter tous les mouvements
      ghosts.forEach(g => g.resetVelocity());
      pacman.velocity.x = pacman.velocity.y = 0;
      
      // Décrémenter le nombre de vies
      setLives(prevLives => {
        const newLives = prevLives - 1;
        
        // Vérifier si le jeu est terminé (0 vies restantes)
        if (newLives <= 0) {
          setGameOver(true);
          return 0;
        }
        
        // Réinitialiser les positions après un court délai
        setTimeout(() => {
          // Remettre les fantômes à leur position initiale
          ghosts.forEach(g => g.resetPosition());
          // Remettre Pacman à sa position initiale
          pacman.resetPosition();
          // Remettre les vitesses à zéro pour que le joueur doive les contrôler
          pacman.velocity.x = 0;
          pacman.velocity.y = 0;
          // Réactiver le mouvement
          ghostCollision = false;
        }, 1000);
        
        return newLives;
      });
    }
    
    // Mettre à jour les fantômes uniquement si ce n'est pas Game Over
    if (!gameOver) {
      ghost.update(pacman, pacLeftRight, pacUpDown, ghosts, ghostCollision);
    }
  });
       
    }

    

    // Gestionnaire d'événements pour les touches du clavier
    const handleKeyDown = (event) => {
      const { key } = event;
      switch (key) {
        case 'w':
          keys.w.pressed = true;
          lastKey = 'w';
          break;
        case 's':
          keys.s.pressed = true;
          lastKey = 's';
          break;
        case 'a':
          keys.a.pressed = true;
          lastKey = 'a';
          break;
        case 'd':
          keys.d.pressed = true;
          lastKey = 'd';
          break;
        default:
          break;
      }
    };

    // Ajouter les écouteurs d'événements
    window.addEventListener('keydown', handleKeyDown);

    // Démarrer le jeu
    if (gameStarted) {
      animate();
    }
     // Si resetGame est vrai, réinitialiser les pellets
  if (resetGame) {
    // Recréer les pellets à partir de la carte
    pellets = [];
    map.forEach((line, i) => {
      line.forEach((bound, j) => {
        if (bound === 2) {
          pellets.push(new Pellet({
            position: {
              x: Boundary.WIDTH * (j + 1 / 2),
              y: Boundary.HEIGHT * (i + 1 / 2)
            }
          }));
        }
      });
    });
    
    // Réinitialiser les positions
    pacman.resetPosition();
    ghosts.forEach(ghost => ghost.resetPosition());
    
    // Désactiver le flag de réinitialisation
    setResetGame(false);
  }

    // Nettoyer les écouteurs lors du démontage du composant
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameStarted,resetGame]); // Le jeu se réinitialise si gameStarted change

  return (
    <div className="game-container" style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'black' }}>
      {showForm ? (
        <div className="login-overlay" style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.85)',
          zIndex: 100
        }}>
          <div className="login-form" style={{
            background: '#222',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '400px',
            width: '100%',
            color: 'white',
            boxShadow: '0 0 20px rgba(52, 45, 202, 0.6)'
          }}>
            <h2 style={{ textAlign: 'center', color: 'yellow', marginBottom: '20px' }}>Bienvenue à Pac-Man!</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="username" style={{ display: 'block', marginBottom: '8px' }}>Nom d'utilisateur:</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '5px',
                    border: '1px solid #342DCA',
                    background: '#111',
                    color: 'white',
                    fontSize: '16px'
                  }}
                  placeholder="Entrez votre nom de joueur"
                />
              </div>
              
              {errorMessage && (
                <div style={{ color: 'red', marginBottom: '15px', textAlign: 'center' }}>
                  {errorMessage}
                </div>
              )}
              
              <button 
                type="submit" 
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '5px',
                  background: '#342DCA',
                  color: 'white',
                  border: 'none',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'background 0.3s'
                }}
              >
                Commencer à jouer
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', marginTop: '20px' }}>
            <canvas 
              ref={canvasRef} 
              className="game-canvas" 
              style={{ background: 'black', display: 'block' }} 
            />
            
            {/* Afficher le nom du joueur connecté */}
            <div style={{ 
              position: 'absolute', 
              top: '10px', 
              right: '10px', 
              color: 'white', 
              background: 'rgba(52, 45, 202, 0.7)',
              padding: '5px 10px',
              borderRadius: '5px'
            }}>
              Joueur: {playerData?.username || username}
            </div>
            
            {!gameStarted && !gameOver && (
              <div className="start-overlay" style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center',
                background: 'rgba(0,0,0,0.7)'
              }}>
                {lastScore > 0 && (
                  <div style={{
                    color: 'white',
                    fontSize: '24px',
                    marginBottom: '20px'
                  }}>
                    Votre dernier score: {lastScore}
                  </div>
                )}
                <button 
                  onClick={() => setGameStarted(true)}
                  style={{ 
                    padding: '10px 20px', 
                    fontSize: '20px',
                    background: '#342DCA',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Démarrer le jeu
                </button>
              </div>
            )}
            
            {gameOver && (
              <div className="game-over-overlay" style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center',
                background: 'rgba(0,0,0,0.85)',
                color: 'red',
                fontSize: '36px',
                fontWeight: 'bold'
              }}>
                <div>GAME OVER</div>
                <div style={{ fontSize: '24px', marginTop: '20px', color: 'white' }}>Score final: {score}</div>
                  <div style={{ fontSize: '16px', marginTop: '10px', color: '#aaa' }}>
                    Score sauvegardé pour {playerData?.username || username}
                  </div>
                <button 
                  onClick={() => {
                    setLives(3);
                    setScore(0);
                    setGameOver(false);
                    setResetGame(true);
                  }}
                  style={{ 
                    padding: '10px 20px', 
                    fontSize: '20px', 
                    marginTop: '30px',
                    background: '#342DCA',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Rejouer
                </button>
              </div>
            )}
          </div>
          
          {/* Section d'affichage du score et des vies */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            width: '100%', 
            padding: '10px 0', 
            background: '#222',
            position: 'absolute',
            bottom: '0',
            color: 'white',
            fontSize: '24px',
            borderTop: '2px solid #444'
          }}>
            <div className="score-display" style={{ marginRight: '30px', display: 'flex', alignItems: 'center' }}>
              Score: {score} 
              <span style={{ marginLeft: '10px' }}>
                {Array.from({ length: Math.min(5, Math.floor(score/100)) })}
              </span>
            </div>
            <div className="lives-display" style={{ display: 'flex', alignItems: 'center' }}>
              Vies: 
              {Array.from({ length: lives }, (_, i) => (
                <span key={i} role="img" aria-label="pacman life" style={{ marginLeft: '5px' }}>🟡</span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PacmanGame;