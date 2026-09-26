import axios from "axios";



const api = axios.create({

    baseURL: "http://127.0.0.1:8000/api",



    headers: {

        Accept: "application/json",

        "Content-Type": "application/json",

    },

});





/*

|--------------------------------------------------------------------------

| GET AUTHENTICATION TOKEN

|--------------------------------------------------------------------------

|

| Check localStorage first.

| If it does not exist, check sessionStorage.

|

*/



function getToken() {

    return (

        localStorage.getItem("uniteq_token") ||

        sessionStorage.getItem("uniteq_token")

    );

}





/*

|--------------------------------------------------------------------------

| REQUEST INTERCEPTOR

|--------------------------------------------------------------------------

|

| Automatically attach the current authentication token

| to every protected Laravel API request.

|

*/



api.interceptors.request.use(

    (config) => {



        const token = getToken();



        if (token) {



            config.headers.Authorization =

                `Bearer ${token}`;



        }



        config.headers.Accept =

            "application/json";



        return config;

    },



    (error) => {

        return Promise.reject(error);

    }

);





/*

|--------------------------------------------------------------------------

| RESPONSE INTERCEPTOR

|--------------------------------------------------------------------------

|

| If Laravel says the token is invalid or expired,

| clear the saved authentication information and

| return the user to the login page.

|

*/



api.interceptors.response.use(



    (response) => {

        return response;

    },



    (error) => {



        if (error.response?.status === 401) {



            console.warn(

                "Authentication failed. Clearing UniTeq session."

            );



            localStorage.removeItem(

                "uniteq_token"

            );



            localStorage.removeItem(

                "uniteq_user"

            );



            sessionStorage.removeItem(

                "uniteq_token"

            );



            sessionStorage.removeItem(

                "uniteq_user"

            );



            /*

             * Only redirect if we are not already

             * on the login page.

             */



            if (window.location.pathname !== "/") {



                window.location.href = "/";



            }



        }



        return Promise.reject(error);

    }

);





export default api; 

