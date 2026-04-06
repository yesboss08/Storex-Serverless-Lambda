 echo "i am in bash file"

# if [ "$needInstall" = "true" ]; then
# echo "$needInstall installation needed"
# npm install
# fi


# echo 'ended'

ssh Store-X << 'ENDSSH'
bash Client.sh
ENDSSH
