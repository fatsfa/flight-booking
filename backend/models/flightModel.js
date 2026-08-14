const pool = require('../config/db');

const getAllFlights=async()=> {
  const result=await pool.query('SELECT * FROM flights ORDER BY departure_time ASC');
  return result.rows
}
const searchFlights=async (origin,destination)=>{
  const result= await pool.query(
    'SELECT * FROM flights WHERE origin ILIKE $1 AND destination ILIKE $2 ORDER BY departure_time ASC',
    [`%${origin}%`, `%${destination}%`]
  )
  return result.rows;
}
const createFlight=async(origin, destination, departure_time, price, seats_available) =>{
  const result=await pool.query(
    'INSERT INTO flights (origin, destination, departure_time, price, seats_available) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [origin, destination, departure_time, price, seats_available]
  )
  return result.rows[0];
}

const updateFlight=async (id,updates)=>{
  const {origin, destination, departure_time, price, seats_available } = updates;
  const result = await pool.query(
    `UPDATE flights SET origin=$1, destination=$2, departure_time=$3, price=$4, seats_available=$5
     WHERE id=$6 RETURNING *`,
    [origin, destination, departure_time, price, seats_available, id]
  )
  return result.rows[0]
}
const deleteFlight=async(id)=>{
  await pool.query('DELETE FROM flights WHERE id = $1', [id]);
}
module.exports={getAllFlights,searchFlights,createFlight,updateFlight,deleteFlight};