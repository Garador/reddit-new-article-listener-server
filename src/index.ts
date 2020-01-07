import './LoadEnv'; // Must be the first import
import app from './Server';

// Start the server
const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
    console.log("Litening on port: "+port);
});
