import axios from "axios";

const AxiosInstance = axios.create({
  timeout: 1000 * 15,
});

export default AxiosInstance;
