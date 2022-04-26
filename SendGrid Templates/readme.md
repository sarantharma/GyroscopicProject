# SendGrid Dynamic Email Templates
## These are the email templates used for the outgoing emails sent using SendGrid.
### API_KEY on line 25 of [app.js](https://github.com/sarantharma/GyroscopicProject/blob/passport/app.js) must be set to a valid SendGrid API key for the emails to be sent.

Dynamic Team Invite is used for team owners to send invitations to their team via email. The email notifies the invitee which team they have been added to and provides a link to the team's page.
Example of an email invite:
![Email invitation](https://github.com/sarantharma/GyroscopicProject/blob/passport/User%20Guides/img/invitation_email.png)
Template ID: d-478522bdf29f47468a107e3540e0d577

Password Reset is used for sending users a password recovery email. The email provides a secure link to a page where the user can enter a new password for their account. The links expire after 30 minutes.
Example of a password recovery email:
![Password recovery email](https://github.com/sarantharma/GyroscopicProject/blob/passport/User%20Guides/img/password_recovery_email.png)
Template ID: d-fdf4fd19ea93442cae5c4128866a618c
