module.exports = {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          'kenya-black': '#000000', // Kenyan flag black
          'kenya-red': '#DC143C',   // Kenyan flag red
          'kenya-green': '#008000', // Kenyan flag green
          'kenya-white': '#FFFFFF', // Kenyan flag white
        },
      },
    },
    plugins: [],
  };