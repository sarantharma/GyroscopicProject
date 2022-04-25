# Password Recovery
## Changing a forgotten password

A user can reset their password from a link sent to their email. This is done by first clicking on the "Forgot password" link on the login page:
![Forgot password link](https://github.com/sarantharma/GyroscopicProject/blob/passport/User%20Guides/img/forgot_password.png)

This brings them to the Forgot Password page, where they can enter their email to send a recovery email:
![Forgot password page](https://github.com/sarantharma/GyroscopicProject/blob/passport/User%20Guides/img/forgot_password_page.png)

This generates a verified link that expires after 30 minutes and sends it to the user's email on a dynamic Sendgrid template:
![Recovery email](https://github.com/sarantharma/GyroscopicProject/blob/passport/User%20Guides/img/password_recovery_email.png)

After clicking the link, the user is brought to the Reset page where thay can enter a new password:
![Password reset page](https://github.com/sarantharma/GyroscopicProject/blob/passport/User%20Guides/img/new_password.png)

The password must meet the same requirements as with creating an account: 
    - Include at least one number
    - Include at least one lowercase letter
    - Include at least one uppercase letter
    - Be 6 to 15 characters long

After submission, the user's password in the collection is updated to the new password.
