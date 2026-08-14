const bcrypt=require('bcrypt')
const jwt=require('jsonwebtoken')
const {createUser,findUserByEmail }=require('../models/userModel')
const signup=async(req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    const existingUser=await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    const passwordHash=await bcrypt.hash(password, 10)
    const user = await createUser(name, email, passwordHash)

    res.status(201).json({ message: 'User created', user })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error:'Something went wrong'})
  }
}

const login=async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await findUserByEmail(email)
    if (!user){
      return res.status(400).json({ error: 'Invalid email or password' })
    }
    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch){
      return res.status(400).json({ error: 'Invalid email or password'})
    }

    const token = jwt.sign(
      {id: user.id, role: user.role},
      process.env.JWT_SECRET,
      {expiresIn: '7d'}
    )

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err){
    console.error(err);
    res.status(500).json({ error: 'Something went wrong'})
  }
}
module.exports = { signup, login }