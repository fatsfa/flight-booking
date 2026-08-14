const {
  getAllFlights,searchFlights,createFlight,updateFlight,deleteFlight
}=require('../models/flightModel')
const listFlights = async (req, res) => {
  try {
    const {origin,destination} = req.query;
    const flights = (origin && destination)
      ? await searchFlights(origin, destination)
      : await getAllFlights()
    res.json(flights)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' });
  }
}
const addFlight=async (req, res) =>{
  try {
    const { origin, destination, departure_time, price, seats_available } = req.body;
    if (!origin || !destination || !departure_time || !price || !seats_available) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const flight = await createFlight(origin, destination, departure_time, price, seats_available)
    res.status(201).json(flight);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' })
  }
}
const editFlight = async (req, res) => {
  try {
    const flight = await updateFlight(req.params.id, req.body)
    if (!flight) return res.status(404).json({ error: 'Flight not found' })
    res.json(flight);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' })
  }
}
const removeFlight=async (req, res) => {
  try {
    await deleteFlight(req.params.id)
    res.json({ message: 'Flight deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
}

module.exports={ listFlights,addFlight,editFlight,removeFlight}