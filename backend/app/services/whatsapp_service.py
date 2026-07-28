import re
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from twilio.rest import Client
from app.config import settings

# Configure structured Python logging for WhatsApp service
logger = logging.getLogger("whatsapp_service")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)


def format_whatsapp_number(number_str: str) -> str:
    """
    Format raw phone numbers into standard Twilio E.164 WhatsApp format.
    Examples:
      '9137570219' -> 'whatsapp:+919137570219'
      '+919137570219' -> 'whatsapp:+919137570219'
      'whatsapp:+919137570219' -> 'whatsapp:+919137570219'
    """
    if not number_str:
        return ""
    clean = number_str.strip()
    if clean.startswith("whatsapp:"):
        clean = clean.replace("whatsapp:", "").strip()

    # Remove non-digit and non-plus characters
    clean = re.sub(r"[^\d+]", "", clean)

    if not clean.startswith("+"):
        # Auto-prepend Indian country code +91 if 10-digit number is passed
        if len(clean) == 10:
            clean = f"+91{clean}"
        else:
            clean = f"+{clean}"

    return f"whatsapp:{clean}"


class WhatsAppService:
    """
    Production-grade WhatsApp Notification Service encapsulating Twilio SDK.
    Provides reusable methods for text messaging, admin WhatsApp invite links,
    OTP password reset messages, and booking notifications.
    """

    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.from_number = settings.TWILIO_WHATSAPP_FROM
        self.admin_number = settings.ADMIN_WHATSAPP_NUMBER
        self.admin_panel_url = settings.ADMIN_PANEL_URL

    def _get_client(self) -> Optional[Client]:
        """Private helper to instantiate Twilio client instance."""
        if self.account_sid and self.auth_token:
            return Client(self.account_sid, self.auth_token)
        return None

    def send_text_message(self, to_number: str, body: str) -> Optional[str]:
        """
        Send a raw text WhatsApp message to a specified recipient.
        Automatically formats target number to Twilio E.164 standard.
        """
        formatted_to = format_whatsapp_number(to_number)
        formatted_from = format_whatsapp_number(self.from_number) if self.from_number else None

        logger.info(f"WhatsApp notification started for recipient: {formatted_to}")

        if not all([self.account_sid, self.auth_token, formatted_from]):
            logger.warning("Twilio credentials incomplete in config. Skipping message dispatch.")
            return None

        try:
            client = self._get_client()
            if not client:
                logger.error("Failed to instantiate Twilio client.")
                return None

            message = client.messages.create(
                body=body,
                from_=formatted_from,
                to=formatted_to
            )

            logger.info(
                f"WhatsApp notification success | Recipient: {formatted_to} | Twilio SID: {message.sid}"
            )
            return message.sid

        except Exception as e:
            logger.error(f"WhatsApp notification failure | Recipient: {formatted_to} | Error: {str(e)}", exc_info=True)
            return None

    def send_admin_invite_link(self, to_number: str, full_name: str, invite_link: str) -> bool:
        """
        Send WhatsApp invite link to a new Admin recipient.
        """
        body = (
            f"🙏 *Jai Shree Shyam*\n\n"
            f"Welcome to Nishan Yatra Mandal!\n\n"
            f"You have been invited by Super Admin as an Administrator for *{full_name}*.\n\n"
            f"Please click the link below to set up your username and password:\n"
            f"👉 {invite_link}\n\n"
            f"This invite link will expire in 24 hours.\n\n"
            f"Jai Shree Shyam 🙏"
        )
        sid = self.send_text_message(to_number=to_number, body=body)
        return sid is not None

    def send_otp_notification(self, to_number: str, username: str, otp_code: str) -> bool:
        """
        Send WhatsApp OTP code for password reset verification.
        """
        body = (
            f"🙏 *Jai Shree Shyam*\n\n"
            f"Password Reset Verification Code for *{username}*:\n\n"
            f"🔑 *OTP:* *{otp_code}*\n\n"
            f"This code will expire in 5 minutes.\n"
            f"If you did not request this reset, please notify Super Admin immediately."
        )
        sid = self.send_text_message(to_number=to_number, body=body)
        return sid is not None

    def send_booking_notification(self, booking_data: Dict[str, Any]) -> bool:
        """
        Format and send structured booking request alert to admin WhatsApp recipients.
        """
        try:
            name = booking_data.get("full_name", "N/A")
            phone = booking_data.get("phone", "N/A")
            address = booking_data.get("address", "N/A")
            booking_date = booking_data.get("booking_date", "N/A")
            notes = booking_data.get("notes", "None") or "None"
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S IST")

            formatted_body = (
                f"🙏 *JAI SHREE SHYAM* 🙏\n\n"
                f"*New Bhajan Booking Request*\n\n"
                f"👤 *Name:* {name}\n"
                f"📞 *Phone:* {phone}\n"
                f"📅 *Preferred Date:* {booking_date}\n"
                f"📍 *Address:* {address}\n"
                f"📝 *Notes:* {notes}\n\n"
                f"🔗 *Admin Panel:* {self.admin_panel_url}\n"
                f"⏰ *Booking Timestamp:* {timestamp}"
            )

            recipients = settings.admin_whatsapp_numbers
            if not recipients:
                logger.warning("ADMIN_WHATSAPP_NUMBER not configured. Message fallback:\n" + formatted_body)
                return False

            success_count = 0
            for recipient in recipients:
                sid = self.send_text_message(to_number=recipient, body=formatted_body)
                if sid:
                    success_count += 1

            return success_count > 0

        except Exception as e:
            logger.error(f"Failed to format/send booking notification | Error: {str(e)}", exc_info=True)
            return False


# Singleton instance of WhatsAppService for service layer reuse
whatsapp_service = WhatsAppService()


def send_booking_notification_task(booking_data: Dict[str, Any]) -> None:
    """Background task wrapper for booking notification alerts."""
    whatsapp_service.send_booking_notification(booking_data)


def send_invite_link_task(to_number: str, full_name: str, invite_link: str) -> None:
    """Background task wrapper for WhatsApp invite link dispatch."""
    whatsapp_service.send_admin_invite_link(to_number=to_number, full_name=full_name, invite_link=invite_link)


def send_otp_task(to_number: str, username: str, otp_code: str) -> None:
    """Background task wrapper for WhatsApp OTP dispatch."""
    whatsapp_service.send_otp_notification(to_number=to_number, username=username, otp_code=otp_code)
